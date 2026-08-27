import { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext.jsx';
import { buildSuggestions, groupByCategory, PRIORITY_LABEL } from '../lib/aiSuggestions.js';
import AISuggestionsCard from './AISuggestionsCard.jsx';

const CATEGORY_ICON = {
  'Préstamo Verde': '🌱',
  'Crédito Ambiental': '🌳',
  'Microcrédito': '🤝',
  'Seguro': '🛟',
  'Retención': '🛡',
  'Inversión': '📈',
};

// Full-page IA Suggestions route. Lists every recommendation for the current
// territory selection (or "Promedio nacional"), grouped by category.
export default function AISuggestionsPage({ clients, events }) {
  const { selectedTerritory } = useDashboard();

  const territoryName = selectedTerritory
    ? selectedTerritory.nombreMunicipio || selectedTerritory.nombreProvincia
    : 'Promedio nacional';

  const filteredClients = useMemo(() => {
    if (!selectedTerritory) return clients;
    if (selectedTerritory.level === 'municipio') {
      return clients.filter((c) => c.territorioCodigo === selectedTerritory.codigoMunicipio);
    }
    if (selectedTerritory.level === 'provincia') {
      return clients.filter((c) => c.codigoProvincia === selectedTerritory.codigoProvincia);
    }
    return clients;
  }, [clients, selectedTerritory]);

  const filteredEvents = useMemo(() => {
    if (!selectedTerritory) return events;
    if (selectedTerritory.level === 'municipio') {
      return events.filter((e) => e.codigoMunicipio === selectedTerritory.codigoMunicipio);
    }
    if (selectedTerritory.level === 'provincia') {
      return events.filter((e) => e.codigoProvincia === selectedTerritory.codigoProvincia);
    }
    return events;
  }, [events, selectedTerritory]);

  const suggestions = useMemo(
    () => buildSuggestions({ clients: filteredClients, events: filteredEvents, territoryName }),
    [filteredClients, filteredEvents, territoryName]
  );
  const grouped = useMemo(() => groupByCategory(suggestions), [suggestions]);

  return (
    <div className="p-3 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div className="xl:col-span-8 space-y-3">
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] neon-text-violet">
            ◆ Recomendaciones Inteligentes
          </div>
          <div className="text-[10px] text-ink-600 font-mono mt-1">
            {territoryName} · {filteredClients.length.toLocaleString('es-DO')} cliente(s) ·{' '}
            {filteredEvents.length.toLocaleString('es-DO')} alerta(s)
          </div>
          <p className="text-xs text-ink-700 mt-2 leading-relaxed">
            Motor de reglas que cruza la cartera de clientes con las alertas ambientales geo-localizadas.
            Cada sugerente incluye prioridad, confianza y la acción recomendada; algunas también exponen
            métricas soporte al expandir la tarjeta.
          </p>
        </div>

        {grouped.map((g) => (
          <section key={g.category} className="glass rounded-xl overflow-hidden">
            <header className="border-b border-neon-500/15 px-4 py-2.5 bg-white/40">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] neon-text flex items-center gap-2">
                <span>{CATEGORY_ICON[g.category] || '◆'}</span>
                <span>{g.category}</span>
                <span className="text-[10px] text-ink-500 font-mono">
                  · {g.items.length} sugerencia(s)
                </span>
              </div>
            </header>
            <ul className="p-3 space-y-2">
              {g.items.map((s) => (
                <SuggestionFull key={s.id} s={s} />
              ))}
            </ul>
          </section>
        ))}

        {suggestions.length === 0 && (
          <div className="glass rounded-xl p-6 text-center">
            <div className="text-base mb-1">◇</div>
            <div className="text-sm text-ink-700 font-mono">
              No hay recomendaciones para este territorio.
            </div>
            <div className="text-xs text-ink-500 mt-1 font-mono">
              Selecciona otra zona o revisa la pestaña de Alertas Ambientales.
            </div>
          </div>
        )}
      </div>

      <div className="xl:col-span-4 space-y-3">
        <AISuggestionsCard
          clients={filteredClients}
          events={filteredEvents}
          territoryName={territoryName}
          compact={false}
        />
      </div>
    </div>
  );
}

function SuggestionFull({ s }) {
  const info = PRIORITY_LABEL[s.priority] || PRIORITY_LABEL[1];
  const metrics = s.supportingMetrics || {};
  return (
    <li className="rounded-md border border-neon-500/15 bg-white/50 p-3 hover:border-plasma-400/50 transition">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono"
          style={{ color: info.color, borderColor: info.color, background: `${info.color}1A` }}
        >
          ● {info.label}
        </span>
        <span className="text-[10px] text-ink-500 font-mono">
          {Math.round(s.confidence * 100)}% confianza
        </span>
      </div>
      <div className="text-sm font-semibold text-ink-900">{s.title}</div>
      <div className="text-[11px] text-neon-500 font-mono mt-1">▸ {s.action}</div>
      <p className="text-xs text-ink-700 mt-2 leading-relaxed">{s.rationale}</p>
      {Object.keys(metrics).length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {Object.entries(metrics).map(([k, v]) => (
            <div key={k} className="text-[10px] font-mono">
              <span className="text-ink-500">{k}: </span>
              <span className="text-neon-500 font-semibold">
                {typeof v === 'number' ? v.toLocaleString('es-DO', { maximumFractionDigits: 0 }) : v}
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}