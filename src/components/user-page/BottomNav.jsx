// BottomNav — mobile navigation bar pinned to the bottom of the user-page.
// Three items: Inicio (Home), Reportes (alias for Inicio with anchor scroll),
// and "Hacer denuncia" (primary CTA, opens the form modal).
//
// This is intentionally simple: we don't have routing state here, the parent
// owns the visible screen and passes `active` + `onSelect`.

const ICON_HOME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12L12 4l9 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v9h14V10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 19v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_REPORT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" strokeLinejoin="round" />
    <path d="M14 3v6h6" strokeLinejoin="round" />
    <path d="M8 13h8M8 17h5" strokeLinecap="round" />
  </svg>
);

const ICON_PLUS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

export default function BottomNav({ active = 'home', onSelect }) {
  return (
    <nav
      className="sticky bottom-0 left-0 right-0 z-30 bg-surface-200/95 backdrop-blur border-t border-white/8 grid grid-cols-3 gap-1 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Navegación inferior"
    >
      <button
        onClick={() => onSelect?.('home')}
        className={`flex flex-col items-center gap-0.5 py-1 rounded-lg transition ${
          active === 'home' ? 'text-neon-300' : 'text-ink-400 hover:text-ink-200'
        }`}
      >
        <span className="h-6 w-6">{ICON_HOME}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider">Inicio</span>
      </button>

      <button
        onClick={() => onSelect?.('home', 'reports')}
        className="flex flex-col items-center gap-0.5 py-1 rounded-lg text-ink-400 hover:text-ink-200 transition"
      >
        <span className="h-6 w-6">{ICON_REPORT}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider">Reportes</span>
      </button>

      <button
        onClick={() => onSelect?.('denuncia')}
        className="relative flex flex-col items-center gap-0.5 py-1 rounded-lg transition"
      >
        <span
          className="absolute -top-5 h-12 w-12 rounded-full grid place-items-center shadow-glow-plasma"
          style={{
            background: 'linear-gradient(135deg, #B5D33C, #4FB8A2)',
            color: '#0F1622',
          }}
        >
          <span className="h-6 w-6">{ICON_PLUS}</span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-300 mt-7">
          Denunciar
        </span>
      </button>
    </nav>
  );
}
