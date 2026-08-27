import { useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import ClientsTable from './components/ClientsTable.jsx';
import AlertsTable from './components/AlertsTable.jsx';
import AISuggestionsPage from './components/AISuggestionsPage.jsx';
import { DashboardProvider, useDashboard } from './context/DashboardContext.jsx';
import { generateClients } from './data/generateClients.js';
import { generateClimateEvents } from './data/generateClimateEvents.js';
import { findMacroregionForProvince, MACRO_TO_PROVINCES } from './lib/territoryLookup.js';

function LoadingScreen({ progress }) {
  return (
    <div className="h-screen w-screen grid place-items-center relative overflow-hidden bg-ink-50">
      {/* Soft gradient backdrop — EcoPop palette */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(14,77,58,0.06), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(165,204,63,0.10), transparent 60%)',
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
        <div className="text-[11px] text-ink-600 tracking-wider mb-6 font-mono">
          Cargando datos geográficos · República Dominicana
        </div>
        <div className="h-1.5 w-80 overflow-hidden rounded-full bg-ink-200 mx-auto">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #0E4D3A, #A5CC3F)',
            }}
          />
        </div>
        <div className="mt-3 text-xs text-neon-500 font-mono">
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
    <div className="h-screen w-screen grid place-items-center p-6 bg-ink-50">
      <div className="max-w-md glass-strong rounded-xl border border-danger-200 p-6 shadow-glow-danger">
        <div className="text-base font-bold text-danger-600 mb-2">
          ⚠ Error al cargar datos
        </div>
        <div className="text-sm text-ink-800 mb-3 font-mono">{error}</div>
        <div className="text-xs text-ink-500 font-mono">
          Verifica que los archivos geojson estén en{' '}
          <code className="bg-ink-100 px-1 rounded text-neon-500">public/data/</code>.
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { selectedTerritory, setSelectedTerritory } = useDashboard();
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
        const generatedEvents = generateClimateEvents(muniRes, 120);
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

  const tabs = [
    { id: 'dashboard', label: 'Mapa', icon: '◆' },
    { id: 'ai', label: 'IA', icon: '◈' },
    { id: 'clients', label: 'Clientes', icon: '◉' },
    { id: 'alerts', label: 'Alertas Ambientales', icon: '◬' },
  ];

  return (
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-50 glass border-b border-ink-200">
        <div
          className="absolute inset-x-0 -bottom-px h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(14,77,58,0.45), rgba(165,204,63,0.6), transparent)',
          }}
        />
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 relative">
          <div className="flex items-center gap-3">
            <img
              src="/ecopop-logo.svg"
              alt="EcoPop"
              className="h-8 md:h-9"
            />
            <div className="hidden md:block text-[10px] text-ink-500 tracking-[0.04em] font-mono pl-3 border-l border-ink-200">
              Dashboard geográfico interactivo · RD
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-neon-500 text-white border border-neon-500 shadow-glow-soft'
                      : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900 border border-transparent'
                  }`}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </nav>
          <div className="hidden md:flex items-center gap-2 text-[10px] text-ink-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-plasma-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] relative">
        {tab === 'dashboard' && <Dashboard data={data} clients={clients} />}
        {tab === 'ai' && (
          <AISuggestionsPage clients={clients} events={events} />
        )}
        {tab === 'clients' && (
          <div className="p-3">
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
          <div className="p-3">
            <AlertsTable
              events={events}
              territoryFilter={selectedTerritory}
              setTerritoryFilter={setSelectedTerritory}
              options={options}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-ink-200 glass mt-6 py-3 text-center text-[10px] text-ink-500 tracking-widest font-mono">
        ◇ Datos sintéticos con faker · Geojson de fuentes públicas RD ◇
      </footer>
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