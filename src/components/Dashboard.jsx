import { useEffect, useMemo, useState } from 'react';
import MapView from './MapView.jsx';
import KPISection from './KPISection.jsx';
import AISuggestionsCard from './AISuggestionsCard.jsx';
import ClimateAlertsCard from './ClimateAlertsCard.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { computeKPIs, filterClients, filterEvents } from '../hooks/useTerritoryData.js';
import { findMacroregionForProvince } from '../lib/territoryLookup.js';

export default function Dashboard({ data, clients }) {
  const {
    selectedTerritory,
    setSelectedTerritory,
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
      const f = (provincias?.features || []).find(
        (x) => String(x.properties.PROV_COD || '').padStart(2, '0') === selectedTerritory.codigoProvincia
      );
      if (!f) return null;
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
    if (selectedTerritory.level === 'macro') {
      const codes = (data.macroProvinceMap && data.macroProvinceMap[selectedTerritory.macrorregionId]) || [];
      const summed = (municipios?.features || [])
        .filter((m) => codes.includes(String(m.properties.CODONE_PRO || '').padStart(2, '0')))
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
  }, [selectedTerritory, municipios, provincias, data]);

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
    ? selectedTerritory.nombreMunicipio || selectedTerritory.nombreProvincia || selectedTerritory.nombreMacroregion
    : 'Promedio nacional';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 p-3">
      {/* Left column */}
      <div className="xl:col-span-3 space-y-3">
        <KPISection territoryName={territoryName} kpis={kpis} />
        <AISuggestionsCard
          clients={filteredClients}
          events={filteredEvents}
          territoryName={territoryName}
          compact
        />
      </div>

      {/* Center - map */}
      <div className="xl:col-span-6 glass rounded-xl overflow-hidden">
        <div className="border-b border-neon-500/20 px-4 py-3 flex items-center justify-between gap-2 bg-white/40">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] neon-text">
              ◆ Mapa Geográfico · República Dominicana
            </div>
            <div className="text-[10px] text-ink-600 font-mono mt-0.5">
              {hoveredTerritory?.name
                ? `◉ Hover: ${hoveredTerritory.name}`
                : '◌ Selecciona un polígono para ver detalles'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] text-ink-800 cursor-pointer font-mono">
              <input
                type="checkbox"
                checked={showClimateLayer}
                onChange={(e) => setShowClimateLayer(e.target.checked)}
                className="toggle-dark"
              />
              Capa ambiental
            </label>
            <label className="flex items-center gap-2 text-[11px] text-ink-800 cursor-pointer font-mono">
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
        <div className="h-[600px] relative">
          <MapView data={data} clients={clients} />
        </div>
      </div>

      {/* Right column */}
      <div className="xl:col-span-3 space-y-3">
        <ClimateAlertsCard events={filteredEvents} territoryName={territoryName} />
      </div>
    </div>
  );
}