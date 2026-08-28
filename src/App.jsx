import { useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import ClientsTable from './components/ClientsTable.jsx';
import AlertsTable from './components/AlertsTable.jsx';
import AISuggestionsPage from './components/AISuggestionsPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import UserPage from './components/user-page/UserPage.jsx';
import { DashboardProvider, useDashboard } from './context/DashboardContext.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { generateClients } from './data/generateClients.js';
import { generateClimateEvents } from './data/generateClimateEvents.js';
import { findMacroregionForProvince, MACRO_TO_PROVINCES } from './lib/territoryLookup.js';

function LoadingScreen({ progress }) {
  return (
    <div className="h-screen w-screen grid place-items-center relative overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0 opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(14,77,58,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(165,204,63,0.10), transparent 60%)',
        }}
      />
      <div className="relative text-center">
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/ecopop-logo.svg"
            alt="EcoPop"
            className="h-14 md:h-16"
          />
        </div>
        <div className="text-[11px] text-ink-400 tracking-wider mb-6 font-mono">
          Cargando datos geográficos · República Dominicana
        </div>
        <div className="h-1.5 w-80 overflow-hidden rounded-full bg-surface-200 mx-auto border border-white/5">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #0E4D3A, #A5CC3F)',
              boxShadow: '0 0 12px rgba(165, 204, 63, 0.55)',
            }}
          />
        </div>
        <div className="mt-3 text-xs text-neon-300 font-mono">
          <span className="inline-block min-w-[3ch] text-right">{progress}</span>%
        </div>
        <div className="mt-8 text-[10px] text-ink-500 tracking-widest font-mono">
          ◇ Sistema de monitoreo territorial ◇
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="h-screen w-screen grid place-items-center p-6 bg-ink-950">
      <div className="max-w-md glass-strong rounded-xl border border-danger-500/30 p-6 shadow-glow-danger">
        <div className="text-base font-bold text-danger-400 mb-2">
          ⚠ Error al cargar datos
        </div>
        <div className="text-sm text-ink-200 mb-3 font-mono">{error}</div>
        <div className="text-xs text-ink-500 font-mono">
          Verifica que los archivos geojson estén en{' '}
          <code className="bg-surface-300 px-1 rounded text-neon-300">public/data/</code>.
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { selectedTerritory, setSelectedTerritory } = useDashboard();
  const { path, navigate } = useHashRoute();
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setProgress(15);
        const [macroRes, provRes, muniRes] = await Promise.all([
          fetch('/data/dr-macroregiones.json').then((r) => {
            if (!r.ok) throw new Error(`macroregiones HTTP ${r.status}`);
            return r.json();
          }),
          fetch('/data/dr-provincias.geojson').then((r) => {
            if (!r.ok) throw new Error(`provincias HTTP ${r.status}`);
            return r.json();
          }),
          fetch('/data/dr-municipios.geojson').then((r) => {
            if (!r.ok) throw new Error(`municipios HTTP ${r.status}`);
            return r.json();
          }),
        ]);
        if (cancelled) return;
        setProgress(55);
        const generatedClients = generateClients(muniRes, 1500);
        if (cancelled) return;
        setProgress(80);
        const generatedEvents = generateClimateEvents(muniRes, 120, generatedClients);
        if (cancelled) return;
        const annotatedEvents = generatedEvents.map((e) => ({
          ...e,
          macrorregionId: findMacroregionForProvince(e.codigoProvincia),
        }));
        const annotatedClients = generatedClients.map((c) => ({
          ...c,
          macrorregionId: findMacroregionForProvince(c.codigoProvincia),
        }));
        setData({
          macroregiones: macroRes,
          provincias: provRes,
          municipios: muniRes,
          events: annotatedEvents,
          macroProvinceMap: MACRO_TO_PROVINCES,
        });
        setClients(annotatedClients);
        setEvents(annotatedEvents);
        setProgress(100);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const macroList = (data?.macroregiones?.features || []).map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
    }));
    const provinciaList = (data?.provincias?.features || []).map((f) => ({
      code: String(f.properties.PROV_COD || '').padStart(2, '0'),
      name: f.properties.PROV_NOM,
    }));
    const municipioList = (data?.municipios?.features || []).map((f) => ({
      code: String(f.properties.CODONE_MUN || '').padStart(2, '0'),
      name: f.properties.NOMBRE,
      provCode: String(f.properties.CODONE_PRO || '').padStart(2, '0'),
    }));
    return { macroList, provinciaList, municipioList };
  }, [data]);

  if (error) return <ErrorScreen error={error} />;
  if (!data) return <LoadingScreen progress={progress} />;

  // /user-page → end-user mobile shell. Anything else renders the admin SPA.
  if (path === '/user-page') {
    return <UserPage alerts={events} clients={clients} municipios={data.municipios} />;
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar activeTab={tab} onTabChange={setTab} onOpenUserPage={() => navigate('/user-page')} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header activeTab={tab} onOpenUserPage={() => navigate('/user-page')} />
        <main className="flex-1 min-w-0">
          {tab === 'dashboard' && <Dashboard data={data} clients={clients} />}
          {tab === 'ai' && (
            <AISuggestionsPage clients={clients} events={events} />
          )}
          {tab === 'clients' && (
            <div className="p-4">
              <ClientsTable
                clients={clients}
                allClients={clients}
                territoryFilter={selectedTerritory}
                setTerritoryFilter={setSelectedTerritory}
                options={options}
              />
            </div>
          )}
          {tab === 'alerts' && (
            <div className="p-4">
              <AlertsTable
                events={events}
                territoryFilter={selectedTerritory}
                setTerritoryFilter={setSelectedTerritory}
                options={options}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <AppShell />
    </DashboardProvider>
  );
}
