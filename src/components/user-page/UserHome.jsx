import { useMemo } from 'react';
import Avatar from './Avatar.jsx';

// UserHome — top-of-page landing for end-users on mobile.
// Structure:
//   1. Brand header (EcoPop logo + tagline).
//   2. Hero banner with promotional copy ("2 semanas gratis RD").
//   3. Section: "Reportes activos cerca de ti" — vertical list of LARGE alert
//      cards. Each card shows the type illustration as a banner image, severity
//      badge, location, and the avatar of the person who filed the report.
//   4. Primary CTA "Hacer denuncia" (also reachable via the bottom nav).
//
// Props:
//   alerts        : event list (sorted desc by fecha, expected to have
//                   denuncianteNombre / .ilustracion / etc.)
//   onOpenDenuncia: () => void — opens the form.

const SEV_STYLE = {
  Baja:    { label: 'Baja',    color: '#fde047', bg: 'rgba(250,204,21,0.16)',  border: 'rgba(250,204,21,0.45)' },
  Media:   { label: 'Media',   color: '#fdba74', bg: 'rgba(249,115,22,0.16)',  border: 'rgba(249,115,22,0.50)' },
  Alta:    { label: 'Alta',    color: '#fca5a5', bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.55)'  },
  Crítica: { label: 'Crítica', color: '#fecaca', bg: 'rgba(220,38,38,0.22)',   border: 'rgba(220,38,38,0.65)'  },
};

const TIPO_TINT = {
  'Exceso de basura': '#facc15',
  'Inundación': '#60a5fa',
  'Deforestación': '#84cc16',
};

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export default function UserHome({ alerts, onOpenDenuncia }) {
  // Take the most recent ~20 alerts for the feed.
  const feed = useMemo(() => (alerts || []).slice(0, 20), [alerts]);

  return (
    <div className="px-4 pt-3 pb-32 space-y-4 max-w-2xl mx-auto">
      {/* Hero banner */}
      <section className="relative rounded-2xl overflow-hidden border border-white/8 shadow-glow-soft">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(165,204,63,0.30), transparent 60%), radial-gradient(ellipse 60% 80% at 0% 100%, rgba(91,188,154,0.25), transparent 60%), #0B111C',
          }}
        />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src="/ecopop-logo.svg" alt="EcoPop" className="h-7 w-7" />
              <span className="text-[11px] text-ink-300 font-mono uppercase tracking-[0.20em]">
                EcoPop · Rep. Dom.
              </span>
            </div>
            <span className="text-[10px] text-ink-400 font-mono">Rep. Dom.</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-100 leading-tight">
            2 semanas de <span className="neon-text-plasma">Gratis</span> en RD
          </h1>
          <p className="text-[12px] text-ink-300 mt-2 font-mono leading-relaxed">
            Reporta problemas ambientales en tu zona y ayuda a tu comunidad. Cada
            denuncia entra al sistema territorial en tiempo real.
          </p>
          <button
            onClick={onOpenDenuncia}
            className="mt-4 w-full rounded-xl px-4 py-3 font-bold text-sm text-ink-950 shadow-glow-plasma transition active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #B5D33C, #4FB8A2)' }}
          >
            ➕ Hacer una denuncia
          </button>
        </div>
      </section>

      {/* Reports feed */}
      <section id="reports" className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[14px] font-bold text-ink-100">
            Reportes activos cerca de ti
          </h2>
          <span className="text-[10px] text-ink-400 font-mono">
            {feed.length} recientes
          </span>
        </div>

        {feed.length === 0 ? (
          <div className="rounded-xl glass p-6 text-center text-sm text-ink-400 italic font-mono">
            No hay reportes aún. ¡Sé el primero en denunciar!
          </div>
        ) : (
          feed.map((a) => <AlertCard key={a.id} alert={a} />)
        )}
      </section>
    </div>
  );
}

function AlertCard({ alert: a }) {
  const sev = SEV_STYLE[a.severidad] || SEV_STYLE.Baja;
  const tint = TIPO_TINT[a.tipo] || '#5BBC9A';

  return (
    <article className="relative rounded-2xl overflow-hidden border border-white/8 bg-surface-200/70 shadow-glow-soft">
      {/* Illustration banner */}
      <div className="relative h-44 sm:h-52 w-full">
        <img
          src={a.ilustracion || '/illustrations/basura.svg'}
          alt={a.tipo}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-200/95 via-surface-200/40 to-transparent" />
        <span
          className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border"
          style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
        >
          ● {sev.label}
        </span>
        <span
          className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-black/50 text-ink-100"
          title={new Date(a.fecha).toLocaleString('es-DO')}
        >
          ◷ {fmtDate(a.fecha)}
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-bold text-ink-100 leading-tight drop-shadow">
            {a.tipo}
          </h3>
          <p className="text-[11px] text-ink-200 mt-0.5 font-mono truncate">
            ◉ {a.lugar}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        <p className="text-[12px] text-ink-200 leading-snug">
          {a.descripcion}
        </p>

        <div className="flex items-center justify-between text-[11px] text-ink-400 font-mono">
          <span className="truncate">
            📍 {a.municipioAfectado}, {a.provincia}
          </span>
          <span className="text-ink-500">
            {a.poblacionAfectada.toLocaleString('es-DO')} afectados
          </span>
        </div>

        {/* Denouncer attribution */}
        {a.denuncianteNombre && (
          <div className="flex items-center gap-2.5 pt-2 border-t border-white/5">
            <Avatar
              initials={a.denuncianteIniciales}
              color={a.denuncianteColor || '#5BBC9A'}
              size={32}
              ring="plasma"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-ink-100 truncate">
                {a.denuncianteNombre}
              </div>
              <div className="text-[10px] text-ink-400 font-mono truncate">
                {a.denuncianteVocacion || 'Reportó este caso'}
              </div>
            </div>
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                color: tint,
                borderColor: `${tint}66`,
                background: `${tint}1A`,
              }}
            >
              Reportado
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
