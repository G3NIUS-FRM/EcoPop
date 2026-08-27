// AI Suggestions engine
// ---------------------
// Heuristic rule-based system that combines client data with environmental
// alerts to recommend financial products (green loans, insurance, microcredit,
// reforestation credit, etc.) per territory.
//
// The engine runs entirely in-browser — no network calls. Each suggestion has:
//   - id, title, rationale, action (CTA), priority (1-5), confidence (0-1)
//   - supportingMetrics: { ... } for the UI to show in a tooltip/expanded view

const PRIORITY = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

// Pick the most interesting slice of high-income clients in the territory
function highIncomeSlice(clients, threshold = 60000) {
  return (clients || []).filter((c) => (c.ingresoMensual || 0) >= threshold);
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function countBy(events, key, value) {
  return (events || []).filter((e) => e[key] === value).length;
}

// Build the full suggestion list for a given (clients, events, territory) tuple.
export function buildSuggestions({ clients = [], events = [], territoryName = 'Promedio nacional' }) {
  const suggestions = [];
  const totalClients = clients.length;
  const totalEvents = events.length;

  // Severity tallies
  const sevTally = { Baja: 0, Media: 0, Alta: 0, Crítica: 0 };
  for (const e of events) sevTally[e.severidad] = (sevTally[e.severidad] || 0) + 1;
  const criticalEvents = sevTally.Crítica;
  const highEvents = sevTally.Alta;

  // Alert-type tallies
  const typeTally = {};
  for (const e of events) typeTally[e.tipo] = (typeTally[e.tipo] || 0) + 1;

  // Client segment metrics
  const hi = highIncomeSlice(clients);
  const hiAvgIncome = avg(hi.map((c) => c.ingresoMensual));
  const hiAvgExpense = avg(hi.map((c) => c.gastoMensual || 0));
  const insuredClients = (clients || []).filter((c) => c.tieneSeguro);
  const insuredShare = totalClients ? insuredClients.length / totalClients : 0;

  // Population affected sum (where applicable)
  const totalAfectados = events.reduce((acc, e) => acc + (e.poblacionAfectada || 0), 0);

  // 1. Green loans for flood-prone territories with high-income clients.
  //    These clients can absorb a moderate loan and the territory needs recovery.
  if (typeTally['Inundación'] && hi.length >= 5) {
    suggestions.push({
      id: 'green-loans-flood',
      category: 'Préstamo Verde',
      title: 'Préstamos verdes para recuperación por inundaciones',
      rationale:
        `${territoryName} registra ${typeTally['Inundación']} alerta(s) por inundaciones y ` +
        `${hi.length} cliente(s) con ingresos altos (promedio DOP ${Math.round(hiAvgIncome).toLocaleString('es-DO')}/mes). ` +
        `Estos clientes tienen capacidad de pago y están expuestos a pérdidas materiales.`,
      action: 'Ofrecer línea de "Préstamo Verde Resiliencia" con tasa preferencial',
      priority: criticalEvents ? PRIORITY.CRITICAL : PRIORITY.HIGH,
      confidence: 0.9,
      supportingMetrics: {
        alertas: typeTally['Inundación'],
        clientesCapacitados: hi.length,
        ingresoPromedio: hiAvgIncome,
        poblacionAfectada: totalAfectados,
      },
    });
  }

  // 2. Reforestation credit program for deforestation alerts.
  if (typeTally['Deforestación']) {
    suggestions.push({
      id: 'reforestation-credit',
      category: 'Crédito Ambiental',
      title: 'Crédito de reforestación para micro-propietarios',
      rationale:
        `${territoryName} presenta ${typeTally['Deforestación']} alerta(s) por deforestación. ` +
        `${totalClients} cliente(s) podrían beneficiarse de un programa de crédito condicionado ` +
        `a la siembra de especies nativas en sus predios.`,
      action: 'Lanzar programa "Siembra y Crece" con plazos de 24-60 meses',
      priority: highEvents ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      confidence: 0.82,
      supportingMetrics: {
        alertas: typeTally['Deforestación'],
        clientesPotenciales: totalClients,
        duracionRecomendada: '24-60 meses',
      },
    });
  }

  // 3. Trash accumulation → microcredit for waste-pickers + CSR collection.
  if (typeTally['Exceso de basura']) {
    suggestions.push({
      id: 'waste-microcredit',
      category: 'Microcrédito',
      title: 'Microcrédito a recicladores y campañas de recolección',
      rationale:
        `${territoryName} acumula ${typeTally['Exceso de basura']} alerta(s) por residuos sólidos. ` +
        `Una fracción de los ${totalClients} clientes podrían vincularse a cooperativas ` +
        `de recicladores financiadas con microcréditos de bajo monto.`,
      action: 'Alianzas con cooperativas + microcréditos de DOP 5,000-25,000',
      priority: typeTally['Exceso de basura'] >= 3 ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      confidence: 0.74,
      supportingMetrics: {
        alertas: typeTally['Exceso de basura'],
        clientesBase: totalClients,
      },
    });
  }

  // 4. Insurance upsell when territory is alert-prone AND insurance penetration is low.
  if (totalEvents >= 5 && insuredShare < 0.5) {
    suggestions.push({
      id: 'insurance-upsell',
      category: 'Seguro',
      title: 'Campaña de seguros contra desastres naturales',
      rationale:
        `${territoryName} tiene ${totalEvents} alertas geo-localizadas pero solo ` +
        `${Math.round(insuredShare * 100)}% de los ${totalClients} clientes cuenta con seguro. ` +
        `Existe una brecha clara de protección ante eventos climáticos.`,
      action: 'Seguro "Hogar Resiliente" + deducible bonificado por 12 meses',
      priority: PRIORITY.HIGH,
      confidence: 0.95,
      supportingMetrics: {
        alertas: totalEvents,
        clientes: totalClients,
        penetracion: `${Math.round(insuredShare * 100)}%`,
        brecha: totalClients - insuredClients.length,
      },
    });
  }

  // 5. Critical-event credit pause: when a territory is hit hard, offer
  //    payment holidays to existing clients to keep them solvent.
  if (criticalEvents >= 2 && totalClients >= 10) {
    suggestions.push({
      id: 'payment-holiday',
      category: 'Retención',
      title: 'Pausa de pagos para clientes en zona crítica',
      rationale:
        `${territoryName} acumula ${criticalEvents} alerta(s) de severidad Crítica. ` +
        `Aplicar una moratoria de 60-90 días a los ${totalClients} cliente(s) activos ` +
        `evita morosidad sistémica y mantiene la cartera vigente.`,
      action: 'Moratoria 60-90 días + refinanciamiento automático al 4to mes',
      priority: PRIORITY.CRITICAL,
      confidence: 0.97,
      supportingMetrics: {
        criticas: criticalEvents,
        clientes: totalClients,
        gastoPromedio: avg(clients.map((c) => c.gastoMensual || 0)),
      },
    });
  }

  // 6. Cross-sell for high earners in calm territories (no alerts).
  if (totalEvents === 0 && hi.length >= 10 && hiAvgIncome > 80000) {
    suggestions.push({
      id: 'crosssell-investment',
      category: 'Inversión',
      title: 'Cross-sell de fondos de inversión a clientes premium',
      rationale:
        `${territoryName} no presenta alertas ambientales y concentra ${hi.length} cliente(s) ` +
        `con ingresos sobre DOP 60,000/mes. Son candidatos ideales para productos de inversión.`,
      action: 'Cartera "Crecimiento Verde" + asesoría financiera 1:1',
      priority: PRIORITY.MEDIUM,
      confidence: 0.7,
      supportingMetrics: {
        clientesPremium: hi.length,
        ingresoPromedio: hiAvgIncome,
        gastoPromedio: hiAvgExpense,
        ahorroDisponible: avg(hi.map((c) => (c.ingresoMensual || 0) - (c.gastoMensual || 0))),
      },
    });
  }

  // Sort by priority desc, then confidence desc.
  suggestions.sort((a, b) => (b.priority - a.priority) || (b.confidence - a.confidence));
  return suggestions;
}

// Group suggestions by category for the side panel
export function groupByCategory(suggestions) {
  const groups = new Map();
  for (const s of suggestions) {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category).push(s);
  }
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}

export const PRIORITY_LABEL = {
  5: { label: 'Crítica', color: '#dc2626' },
  4: { label: 'Alta', color: '#f97316' },
  3: { label: 'Media', color: '#facc15' },
  2: { label: 'Baja', color: '#22c55e' },
  1: { label: 'Info', color: '#2C8C7B' },
};