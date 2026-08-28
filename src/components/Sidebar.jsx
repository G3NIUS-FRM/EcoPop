// Sidebar — left-rail navigation for the dark "Portal premium" shell.
// Replaces the previous top-nav. Each item is an inline SVG icon + label;
// the active item gets a lime accent rail on the left and a tinted background.

const ITEMS = [
  {
    id: 'dashboard',
    label: 'Inicio',
    hint: 'Mapa + dashboard',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 12L12 4l9 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20v-6h4v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'IA',
    hint: 'Sugerencias',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" strokeLinejoin="round" />
        <path d="M19 14l.9 2.4L22 17l-2.1.6L19 20l-.9-2.4L16 17l2.1-.6L19 14z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'clients',
    label: 'Clientes',
    hint: 'Cartera',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="9" r="3.5" />
        <path d="M3 19c.8-3.4 4-5 6-5s5.2 1.6 6 5" strokeLinecap="round" />
        <path d="M16 8a3 3 0 010 6" strokeLinecap="round" />
        <path d="M16 19c-.3-1.7-1.2-3-2.5-3.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'alerts',
    label: 'Alertas',
    hint: 'Ambientales',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
        <path d="M12 10v4" strokeLinecap="round" />
        <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeTab, onTabChange, onOpenUserPage, collapsed = false }) {
  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col bg-surface-200 border-r border-white/5 h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
      aria-label="Navegación principal"
    >
      {/* Logo + brand */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/5">
        <img src="/ecopop-logo.svg" alt="EcoPop" className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-[13px] font-bold text-ink-100 tracking-wide">EcoPop</div>
            <div className="text-[10px] text-neon-300 font-mono uppercase tracking-[0.18em]">v0.1 · RD</div>
          </div>
        )}
      </div>

      {/* Section title */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 font-bold font-mono">
          Navegación
        </div>
      )}

      {/* Items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {ITEMS.map((it) => {
          const active = activeTab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onTabChange(it.id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition text-left ${
                active
                  ? 'bg-neon-500/15 text-neon-300'
                  : 'text-ink-400 hover:bg-surface-50 hover:text-ink-100'
              }`}
              title={it.hint}
            >
              {/* Active rail */}
              <span
                className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r ${
                  active ? 'bg-plasma-500' : 'bg-transparent'
                }`}
              />
              <span
                className={`h-5 w-5 shrink-0 ${
                  active ? 'text-plasma-400' : 'text-ink-400 group-hover:text-neon-300'
                }`}
              >
                {it.icon(active)}
              </span>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className={`text-[12px] font-semibold tracking-wide ${active ? 'text-ink-100' : ''}`}>
                    {it.label}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-ink-500">
                    {it.hint}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — user-page shortcut + exit placeholder */}
      <div className="px-2 py-3 border-t border-white/5 space-y-1">
        {onOpenUserPage && (
          <button
            onClick={onOpenUserPage}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-ink-300 hover:text-neon-300 hover:bg-neon-500/10 transition group"
            title="Abrir vista de usuario (móvil)"
          >
            <span className="h-5 w-5 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M10 18h4" strokeLinecap="round" />
              </svg>
            </span>
            {!collapsed && (
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[12px] font-semibold tracking-wide">Vista usuario</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-ink-500 group-hover:text-neon-400">
                  /user-page · móvil
                </span>
              </div>
            )}
          </button>
        )}
        <button
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-ink-500 hover:text-ink-100 hover:bg-surface-50 transition"
          title="Cerrar sesión"
        >
          <span className="h-5 w-5 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" strokeLinecap="round" />
              <path d="M10 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 12h12" strokeLinecap="round" />
            </svg>
          </span>
          {!collapsed && (
            <span className="text-[12px] font-semibold tracking-wide">Salir</span>
          )}
        </button>
        {!collapsed && (
          <div className="mt-3 px-3 text-[9px] font-mono uppercase tracking-[0.18em] text-ink-500 leading-relaxed">
            ◇ Datos sintéticos · faker ◇
          </div>
        )}
      </div>
    </aside>
  );
}