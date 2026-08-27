import { useMemo } from 'react';

// Filter clients and events by selected territory.
// territory = { level: 'macro' | 'provincia' | 'municipio', id, name, ... }
export function useTerritoryData({ clients, events, territory }) {
  return useMemo(() => {
    const filteredClients = filterClients(clients, territory);
    const filteredEvents = filterEvents(events, territory);
    return { filteredClients, filteredEvents };
  }, [clients, events, territory]);
}

export function filterClients(clients, territory) {
  if (!territory || !clients?.length) return clients || [];
  if (territory.level === 'municipio') {
    return clients.filter((c) => c.territorioCodigo === territory.codigoMunicipio);
  }
  if (territory.level === 'provincia') {
    return clients.filter((c) => c.codigoProvincia === territory.codigoProvincia);
  }
  if (territory.level === 'macro') {
    return clients.filter((c) => c.macrorregionId === territory.macrorregionId);
  }
  return clients;
}

export function filterEvents(events, territory) {
  if (!territory || !events?.length) return events || [];
  if (territory.level === 'municipio') {
    return events.filter((e) => e.codigoMunicipio === territory.codigoMunicipio);
  }
  if (territory.level === 'provincia') {
    return events.filter((e) => e.codigoProvincia === territory.codigoProvincia);
  }
  if (territory.level === 'macro') {
    return events.filter((e) => e.macrorregionId === territory.macrorregionId);
  }
  return events;
}

// Compute aggregate KPIs for a territory's filtered data and base population stats
export function computeKPIs({ territoryPopulation, filteredClients, filteredEvents }) {
  const pobTotal = territoryPopulation?.pobTot || 0;

  const totalClientes = filteredClients?.length || 0;
  const edadPromedio = filteredClients?.length
    ? filteredClients.reduce((acc, c) => acc + c.edad, 0) / filteredClients.length
    : 0;

  // Average monthly income across filtered clients (RD$).
  const ingresoPromedio = filteredClients?.length
    ? filteredClients.reduce((acc, c) => acc + (c.ingresoMensual || 0), 0) / filteredClients.length
    : 0;

  // Average monthly expense across filtered clients (RD$).
  const gastoPromedio = filteredClients?.length
    ? filteredClients.reduce((acc, c) => acc + (c.gastoMensual || 0), 0) / filteredClients.length
    : 0;

  // Modo de vocación
  const vocCount = {};
  for (const c of filteredClients || []) vocCount[c.vocacion] = (vocCount[c.vocacion] || 0) + 1;
  const vocacionPredominante = Object.entries(vocCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    pobTotal,
    totalClientes,
    edadPromedio,
    ingresoPromedio,
    gastoPromedio,
    vocacionPredominante,
  };
}
