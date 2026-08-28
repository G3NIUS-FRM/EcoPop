// DenunciaConfirm — success screen shown after the form is submitted.
// Confirms the user's report is in the system with a friendly message,
// echoes the key fields they entered, and offers two CTAs:
//   1. "Ver reporte" — scrolls back up to the feed (and the new report at top).
//   2. "Hacer otra"   — reopens the form for additional reports.
//
// Designed mobile-first but scales gracefully to a centered modal on md+.

import { useEffect } from 'react';
import Avatar from './Avatar.jsx';

const TIPO_TINT = {
  'Exceso de basura': '#facc15',
  'Inundación': '#60a5fa',
  'Deforestación': '#84cc16',
};

export default function DenunciaConfirm({ report, onViewReport, onFileAnother, onClose, open = true }) {
  // Restore scroll + Escape handler when the confirmation sheet is up. We only
  // mount the DOM when `open` is true so dismissing (via CTA or backdrop click)
  // fully removes the modal — matches DenunciaForm behaviour.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const tint = TIPO_TINT[report?.tipo] || '#5BBC9A';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 grid place-items-end md:place-items-center bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full md:max-w-md bg-surface-200 border-t md:border border-white/10 md:rounded-2xl rounded-t-2xl shadow-glow-soft overflow-hidden">
        {/* Drag handle */}
        <div className="md:hidden pt-2 pb-1 sticky top-0 bg-surface-200/95 backdrop-blur z-10">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        {/* Animated check */}
        <div className="px-6 pt-5 pb-3 flex flex-col items-center text-center">
          <div className="relative h-20 w-20 mb-3">
            <div
              className="absolute inset-0 rounded-full opacity-50 blur-xl"
              style={{ background: tint }}
            />
            <svg viewBox="0 0 80 80" className="relative h-full w-full">
              <circle cx="40" cy="40" r="34" fill={`${tint}22`} stroke={tint} strokeWidth="2" />
              <path
                d="M26 41 L36 51 L55 30"
                fill="none"
                stroke={tint}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 60,
                  strokeDashoffset: 0,
                  animation: 'denunciaDraw 0.6s ease-out',
                }}
              />
            </svg>
          </div>

          <h2 id="confirm-title" className="text-lg font-bold text-ink-100">
            ¡Tu denuncia ha sido registrada!
          </h2>
          <p className="text-[12px] text-ink-300 font-mono mt-1 max-w-xs">
            El reporte ya aparece en el mapa y en el feed ambiental de tu zona.
          </p>
        </div>

        {/* Report echo card */}
        {report && (
          <div className="mx-5 mb-4 rounded-xl border border-white/8 bg-surface-300/55 p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <img
                src={report.ilustracion}
                alt=""
                className="h-12 w-12 rounded-md object-cover border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ink-100">{report.tipo}</div>
                <div className="text-[11px] text-ink-400 font-mono truncate">
                  ◉ {report.lugar}
                </div>
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{ color: tint, background: `${tint}22`, border: `1px solid ${tint}55` }}
              >
                ● Activa
              </span>
            </div>

            <p className="text-[12px] text-ink-200 leading-snug line-clamp-3">
              {report.descripcion}
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <Avatar
                initials={report.denuncianteIniciales}
                color={report.denuncianteColor}
                size={28}
                ring="plasma"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-ink-100 truncate">
                  {report.denuncianteNombre}
                </div>
                <div className="text-[9px] text-ink-500 font-mono uppercase tracking-wider">
                  ID {report.id.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-2">
          <button
            onClick={onFileAnother}
            className="rounded-xl border border-white/10 bg-surface-300/70 px-3 py-3 text-[12px] font-semibold text-ink-200 hover:bg-surface-50 transition"
          >
            Hacer otra
          </button>
          <button
            onClick={onViewReport}
            className="rounded-xl px-3 py-3 text-[12px] font-bold text-ink-950 shadow-glow-plasma active:scale-[0.98] transition"
            style={{ background: 'linear-gradient(135deg, #B5D33C, #4FB8A2)' }}
          >
            Ver reporte →
          </button>
        </div>
      </div>

      {/* Inline keyframes for the checkmark draw animation. */}
      <style>{`
        @keyframes denunciaDraw {
          from { stroke-dashoffset: 60; opacity: 0; }
          to   { stroke-dashoffset: 0;  opacity: 1; }
        }
      `}</style>
    </div>
  );
}
