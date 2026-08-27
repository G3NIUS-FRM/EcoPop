import { useMemo, useState } from 'react';
import TerritoryCard from './TerritoryCard.jsx';
import { buildSuggestions, groupByCategory, PRIORITY_LABEL } from '../lib/aiSuggestions.js';

const CATEGORY_ICON = {
  'Préstamo Verde': '🌱',
  'Crédito Ambiental': '🌳',
  'Microcrédito': '🤝',
  'Seguro': '🛟',
  'Retención': '🛡',
  'Inversión': '📈',
};

function PriorityBadge({ priority }) {
  const info = PRIORITY_LABEL[priority] || PRIORITY_LABEL[1];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono"
      style={{
        color: info.color,
        borderColor: info.color,
        background: `${info.color}1A`,
      }}
    >
      ● {info.label}
    </span>
  );
}

function SuggestionItem({ s }) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICON[s.category] || '◆';
  const metrics = s.supportingMetrics || {};
  return (
    <li
      className="rounded-md border border-neon-500/15 bg-white/40 hover:border-plasma-400/50 transition overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-2.5 flex items-start gap-2"
      >
        <div className="text-base shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <PriorityBadge priority={s.priority} />
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-neon-500/25 text-neon-500 font-mono">
              {s.category}
            </span>
            <span className="text-[9px] text-ink-500 font-mono ml-auto">
              {Math.round(s.confidence * 100)}% conf.
            </span>
          </div>
          <div className="text-[11px] font-semibold text-ink-900 leading-snug">{s.title}</div>
          <div className="text-[10px] text-ink-600 mt-0.5 font-mono">
            ▸ {s.action}
          </div>
        </div>
        <div className="text-[10px] text-ink-400 font-mono">{open ? '−' : '+'}</div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-neon-500/10">
          <p className="text-[11px] text-ink-700 mt-2 leading-relaxed">{s.rationale}</p>
          {Object.keys(metrics).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1">
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
        </div>
      )}
    </li>
  );
}

export default function AISuggestionsCard({ clients, events, territoryName, compact = true }) {
  const suggestions = useMemo(
    () => buildSuggestions({ clients, events, territoryName }),
    [clients, events, territoryName]
  );
  const grouped = useMemo(() => groupByCategory(suggestions), [suggestions]);
  const limit = compact ? 4 : suggestions.length;
  const visible = suggestions.slice(0, limit);

  return (
    <TerritoryCard
      title="Sugerencias IA"
      subtitle={territoryName || 'Promedio nacional'}
      accent="violet"
      footer={
        suggestions.length === 0
          ? 'Sin sugerencias — datos insuficientes'
          : `${suggestions.length} sugerencia(s) · prioridad máx ${PRIORITY_LABEL[suggestions[0]?.priority]?.label || 'Info'}`
      }
    >
      {suggestions.length === 0 ? (
        <div className="text-xs text-ink-600 italic font-mono">
          No hay alertas ni segmentos de clientes suficientes para generar recomendaciones.
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((s) => (
              <SuggestionItem key={s.id} s={s} />
            ))}
          </ul>
          {compact && suggestions.length > limit && (
            <div className="mt-2 pt-2 border-t border-neon-500/10 text-[10px] text-ink-500 font-mono">
              + {suggestions.length - limit} sugerencia(s) más en la pestaña "IA"
            </div>
          )}
          {!compact && grouped.length > 1 && (
            <div className="mt-3 pt-3 border-t border-neon-500/10">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold mb-1.5">
                Por categoría
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grouped.map((g) => (
                  <span
                    key={g.category}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-neon-500/25 text-neon-500"
                  >
                    {CATEGORY_ICON[g.category] || '◆'} {g.category} · {g.items.length}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </TerritoryCard>
  );
}