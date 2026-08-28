// Header — top bar inside the main column.
// Shows: page title (left) + dynamic greeting + user avatar (right).

const TITLES = {
  dashboard: { title: 'Mapa de Calor · República Dominicana', subtitle: 'Vista territorial en tiempo real' },
  ai:        { title: 'Recomendaciones Inteligentes', subtitle: 'Motor de reglas con cartera + alertas' },
  clients:   { title: 'Cartera de Clientes', subtitle: 'Filtros y búsqueda' },
  alerts:    { title: 'Alertas Ambientales', subtitle: 'Geo-localizadas por lat/lng' },
};

function greet(hour = new Date().getHours()) {
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Header({ activeTab, onOpenUserPage, userName = 'Adrian' }) {
  const meta = TITLES[activeTab] || TITLES.dashboard;
  const greeting = greet();
  const hour = new Date().getHours();
  return (
    <header className="sticky top-0 z-40 h-16 bg-surface-200/85 backdrop-blur border-b border-white/5 flex items-center justify-between gap-4 px-4 md:px-6">
      <div className="min-w-0">
        <h1 className="text-[15px] font-bold text-ink-100 leading-tight truncate">{meta.title}</h1>
        <div className="text-[10px] text-ink-500 font-mono uppercase tracking-wider truncate">
          {meta.subtitle}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Switch to end-user mobile view */}
        {onOpenUserPage && (
          <button
            onClick={onOpenUserPage}
            title="Abrir vista de usuario"
            className="hidden md:inline-flex items-center gap-2 px-3 h-9 rounded-full border border-white/10 bg-surface-300/70 text-[11px] text-ink-200 hover:bg-neon-500/15 hover:text-neon-200 hover:border-neon-400/50 transition font-mono"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
              <rect x="6" y="2" width="12" height="20" rx="2.5" />
              <path d="M10 18h4" strokeLinecap="round" />
            </svg>
            Vista usuario
          </button>
        )}

        {/* Search-like pill — visual decoration only */}
        <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full border border-white/8 bg-surface-300/60 text-[11px] text-ink-500 font-mono w-56">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span>Buscar territorio, cliente…</span>
          <span className="ml-auto text-[9px] text-ink-500 border border-white/8 rounded px-1.5 py-0.5">⌘K</span>
        </div>

        {/* Greeting */}
        <div className="hidden sm:flex flex-col text-right leading-tight">
          <span className="text-[11px] text-ink-300 font-mono">{greeting},</span>
          <span className="text-[12px] text-ink-100 font-bold">{userName} <span className="text-ink-500 font-mono font-normal text-[10px]">· {hour}:00</span></span>
        </div>

        {/* Avatar */}
        <div
          className="h-9 w-9 rounded-full grid place-items-center text-[11px] font-bold text-ink-950 shadow-glow-soft"
          style={{ background: 'linear-gradient(135deg, #B5D33C, #4FB8A2)' }}
          aria-label={userName}
        >
          {initials(userName)}
        </div>
      </div>
    </header>
  );
}