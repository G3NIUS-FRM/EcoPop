import TerritoryCard, { formatNumber } from './TerritoryCard.jsx';

const TYPE_ICON = {
  'Exceso de basura': '🗑',
  'Inundación': '💧',
  'Deforestación': '🌳',
};

const SEV_BG = {
  Baja: 'bg-neon-500/15 text-neon-300 border-neon-400/40',
  Media: 'bg-warn-400/15 text-warn-300 border-warn-400/40',
  Alta: 'bg-warn-500/25 text-warn-300 border-warn-500/60',
  Crítica: 'bg-danger-500/30 text-danger-300 border-danger-400/70',
};

export default function ClimateAlertsCard({ events, territoryName }) {
  const sorted = [...(events || [])]
    .sort((a, b) => {
      const sev = { Crítica: 4, Alta: 3, Media: 2, Baja: 1 };
      return (sev[b.severidad] || 0) - (sev[a.severidad] || 0);
    })
    .slice(0, 5);

  return (
    <TerritoryCard
      title="Alertas Ambientales"
      subtitle={territoryName || 'Promedio nacional'}
      accent="red"
      footer={`${events?.length || 0} alertas geo-localizadas en territorio`}
    >
      {sorted.length === 0 ? (
        <div className="text-xs text-ink-400 italic font-mono">
          No hay alertas ambientales registradas en este territorio.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-2 rounded-md border border-white/8 bg-surface-200/55 p-2 hover:border-danger-400/40 transition"
            >
              <div className="text-base shrink-0 mt-0.5">{TYPE_ICON[e.tipo] || '⚠'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      SEV_BG[e.severidad] || ''
                    }`}
                  >
                    {e.severidad}
                  </span>
                  <span className="text-[11px] text-ink-100 font-semibold truncate">{e.tipo}</span>
                </div>
                <div className="text-[11px] text-neon-300 font-mono truncate">◉ {e.lugar}</div>
                <div className="text-[10px] text-ink-400 truncate font-mono">
                  {e.municipioAfectado}, {e.provincia}
                </div>
                <div className="text-[10px] text-ink-500 font-mono">
                  {formatNumber(e.poblacionAfectada)} afectados · {e.duracionDias}d · geo ({e.lat?.toFixed(3)}, {e.lng?.toFixed(3)})
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TerritoryCard>
  );
}