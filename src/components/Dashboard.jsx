import { useMemo } from 'react';
import MapView from './MapView.jsx';
import KPISection from './KPISection.jsx';
import AISuggestionsCard from './AISuggestionsCard.jsx';
import ClimateAlertsCard from './ClimateAlertsCard.jsx';
import TerritoryCard from './TerritoryCard.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { computeKPIs, filterClients, filterEvents } from '../hooks/useTerritoryData.js';

export default function Dashboard({ data, clients }) {
  const {
    selectedTerritory,
    showClimateLayer,
    setShowClimateLayer,
    showEvents,
    setShowEvents,
    hoveredTerritory,
  } = useDashboard();
  const { provincias, municipios } = data;

  // Aggregate national stats when no territory selected
  const nationalStats = useMemo(() => {
    const features = municipios?.features || [];
    const totalPob = features.reduce((a, f) => a + Number(f.properties.PobTot || 0), 0);
    const men = features.reduce((a, f) => a + Number(f.properties.Men || 0), 0);
    const women = features.reduce((a, f) => a + Number(f.properties.Women || 0), 0);
    return { totalPob, men, women };
  }, [municipios]);

  // Lookup territory population info for the selected territory
  const territoryPopulation = useMemo(() => {
    if (!selectedTerritory) return null;
    if (selectedTerritory.level === 'municipio') {
      const f = (municipios?.features || []).find(
        (x) => String(x.properties.CODONE_MUN || '').padStart(2, '0') === selectedTerritory.codigoMunicipio
      );
      if (!f) return null;
      return {
        pobTot: Number(f.properties.PobTot || 0),
        men: Number(f.properties.Men || 0),
        women: Number(f.properties.Women || 0),
      };
    }
    if (selectedTerritory.level === 'provincia') {
      const provCode = selectedTerritory.codigoProvincia;
      const summed = (municipios?.features || [])
        .filter((m) => String(m.properties.CODONE_PRO || '').padStart(2, '0') === provCode)
        .reduce(
          (acc, m) => ({
            pobTot: acc.pobTot + Number(m.properties.PobTot || 0),
            men: acc.men + Number(m.properties.Men || 0),
            women: acc.women + Number(m.properties.Women || 0),
          }),
          { pobTot: 0, men: 0, women: 0 }
        );
      return summed;
    }
    return null;
  }, [selectedTerritory, municipios]);

  const filteredClients = useMemo(() => filterClients(clients, selectedTerritory), [clients, selectedTerritory]);
  const filteredEvents = useMemo(() => filterEvents(data.events, selectedTerritory), [data.events, selectedTerritory]);

  const kpis = useMemo(() => {
    const popStats = territoryPopulation || {
      pobTot: nationalStats.totalPob,
      men: nationalStats.men,
      women: nationalStats.women,
    };
    return computeKPIs({
      territoryPopulation: popStats,
      filteredClients,
      filteredEvents,
    });
  }, [territoryPopulation, nationalStats, filteredClients, filteredEvents]);

  const territoryName = selectedTerritory
    ? selectedTerritory.nombreMunicipio || selectedTerritory.nombreProvincia
    : 'Promedio nacional';

  // Brief headline used in the greeting row
  const brief = useMemo(() => {
    const clientesStr = (kpis.totalClientes || 0).toLocaleString('es-DO');
    const alertasStr = (filteredEvents.length || 0).toLocaleString('es-DO');
    return `${clientesStr} cliente(s) · ${alertasStr} alerta(s)`;
  }, [kpis.totalClientes, filteredEvents.length]);

  return (
    <div className="p-4 space-y-4">
      {/* Row 1 — Greeting + KPIs strip */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 glass rounded-xl p-5 flex flex-col justify-between overflow-hidden relative">
          <div
            className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-30 blur-2xl"
            style={{ background: 'radial-gradient(circle, #A5CC3F, transparent 70%)' }}
          />
          <div className="relative">
            <div className="text-[10px] font-mono uppercase tracking-[0.20em] text-neon-300">
              Territorio activo
            </div>
            <h2 className="mt-1 text-xl md:text-2xl font-bold text-ink-100 leading-tight">
              {territoryName}
            </h2>
            <p className="mt-2 text-[12px] text-ink-400 font-mono">{brief}</p>
            {hoveredTerritory?.name && (
              <div className="mt-2 text-[11px] text-neon-300 font-mono truncate">
                ◉ Hover: {hoveredTerritory.name}
              </div>
            )}
          </div>
          <div className="relative mt-3 flex items-center gap-3 text-[11px] font-mono">
            <label className="flex items-center gap-2 text-ink-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showClimateLayer}
                onChange={(e) => setShowClimateLayer(e.target.checked)}
                className="toggle-dark"
              />
              Capa ambiental
            </label>
            <label className="flex items-center gap-2 text-ink-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(e) => setShowEvents(e.target.checked)}
                className="toggle-dark"
              />
              Heatmap
            </label>
          </div>
        </div>
        <div className="xl:col-span-8">
          <KPISection territoryName={territoryName} kpis={kpis} />
        </div>
      </div>

      {/* Row 2 — Map + AI suggestions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 glass rounded-xl overflow-hidden flex flex-col">
          <div className="border-b border-white/5 px-4 py-2.5 flex items-center justify-between gap-2 bg-surface-300/40">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] neon-text">
                ◆ Mapa de Calor · República Dominicana
              </div>
              <div className="text-[10px] text-ink-500 font-mono mt-0.5">
                {hoveredTerritory?.name
                  ? `◉ Hover: ${hoveredTerritory.name}`
                  : '◌ Selecciona una provincia para ver detalles · 2× click para deseleccionar'}
              </div>
            </div>
          </div>
          <div className="h-[460px] relative">
            <MapView data={data} clients={clients} />
          </div>
        </div>
        <div className="xl:col-span-4">
          <AISuggestionsCard
            clients={filteredClients}
            events={filteredEvents}
            territoryName={territoryName}
            compact
          />
        </div>
      </div>

      {/* Row 3 — Alerts + Resumen territorial */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <ClimateAlertsCard events={filteredEvents} territoryName={territoryName} />
        </div>
        <div className="xl:col-span-4">
          <ResumenTerritorial
            territoryName={territoryName}
            kpis={kpis}
            filteredClients={filteredClients}
            filteredEvents={filteredEvents}
          />
        </div>
      </div>
    </div>
  );
}

// Compact "summary" card for the bottom-right slot.
function ResumenTerritorial({ territoryName, kpis, filteredClients, filteredEvents }) {
  const insuredCount = (filteredClients || []).filter((c) => c.tieneSeguro).length;
  const insuredPct = filteredClients?.length
    ? Math.round((insuredCount / filteredClients.length) * 100)
    : 0;
  const criticas = filteredEvents.filter((e) => e.severidad === 'Crítica').length;
  const altas = filteredEvents.filter((e) => e.severidad === 'Alta').length;

  return (
    <TerritoryCard
      title="Resumen Territorial"
      subtitle={territoryName}
      accent="plasma"
      footer={`${filteredEvents.length} alerta(s) geo-localizadas`}
    >
      <ul className="space-y-2.5 text-[12px] font-mono">
        <StatRow label="Alertas Críticas" value={criticas} color="#fca5a5" />
        <StatRow label="Alertas Altas" value={altas} color="#fdba74" />
        <StatRow
          label="Clientes con seguro"
          value={`${insuredCount} (${insuredPct}%)`}
          color="#A5CC3F"
        />
        <StatRow
          label="Paga promedio"
          value={
            kpis.ingresoPromedio
              ? `DOP ${Math.round(kpis.ingresoPromedio).toLocaleString('es-DO')}`
              : '—'
          }
          color="#5BBC9A"
        />
        <StatRow
          label="Gasto promedio"
          value={
            kpis.gastoPromedio
              ? `DOP ${Math.round(kpis.gastoPromedio).toLocaleString('es-DO')}`
              : '—'
          }
          color="#4FB8A2"
        />
      </ul>
    </TerritoryCard>
  );
}

function StatRow({ label, value, color = '#5BBC9A' }) {
  return (
    <li className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-ink-400 uppercase tracking-wider text-[10px]">{label}</span>
      <span className="font-bold text-ink-100" style={{ color }}>
        {value}
      </span>
    </li>
  );
}