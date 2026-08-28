import { useState, useEffect, useRef } from 'react';
import { ALERT_TYPES, findMacroregionForProvince } from '../../lib/territoryLookup.js';
import { listDenouncers } from '../../data/generateClients.js';
import LocationPicker from './LocationPicker.jsx';

// DenunciaForm — modal-style form for end-users to file a new environmental
// report. Captures: nombre, tipo (radio cards), problema (textarea), ubicacion
// (text). On submit it produces a new alert with the user's name as
// `denuncianteNombre` and an `avatarColor` derived from their name hash.
//
// Form state is fully controlled and validated client-side. We don't have a
// backend so the new alert is appended to localStorage (`ecoclave.user.reports`)
// and surfaced through the callback chain.

const PROBLEMA_PLACEHOLDERS = {
  'Exceso de basura':
    'Describe el vertedero o acumulación (tamaño, olor, días sin recolección…)',
  'Inundación':
    '¿Qué zonas están anegadas? ¿Hay personas o cultivos afectados?',
  'Deforestación':
    '¿Dónde están talando? ¿Hay maquinaria pesada o quema?',
};

// Deterministic hue from a name string so the same person always renders the
// same color across sessions.
function colorFromName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const colors = ['#5BBC9A', '#A5CC3F', '#4FB8A2', '#facc15', '#fb923c', '#f87171', '#a78bfa', '#60a5fa'];
  return colors[h % colors.length];
}

function initialsFromName(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DenunciaForm({
  open,
  onClose,
  onSubmit,
  existingClients = [],
  existingDenouncers = [],
  municipios = null,
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState(ALERT_TYPES[0]);
  const [problema, setProblema] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [errors, setErrors] = useState({});
  const firstFieldRef = useRef(null);

  // Reset + autofocus when the modal opens.
  useEffect(() => {
    if (open) {
      setErrors({});
      setUbicacion(null);
      setTimeout(() => firstFieldRef.current?.focus(), 60);
    }
  }, [open]);

  // Close on Escape, restore scroll.
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

  function validate() {
    const next = {};
    if (!nombre.trim()) next.nombre = 'Necesitamos tu nombre.';
    else if (nombre.trim().length < 3) next.nombre = 'Nombre demasiado corto.';
    if (!problema.trim() || problema.trim().length < 10)
      next.problema = 'Cuéntanos un poco más (mínimo 10 caracteres).';
    if (!ubicacion || !isFinite(ubicacion.lat) || !isFinite(ubicacion.lng))
      next.ubicacion = 'Toca el mapa para fijar tu ubicación.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const cleanNombre = nombre.trim();
    const color = colorFromName(cleanNombre);
    const initials = initialsFromName(cleanNombre);

    // Try to match an existing denouncer by name to keep avatar / vocation
    // consistent across the feed. Otherwise we attach fresh avatar metadata.
    const match =
      existingDenouncers.find(
        (c) => c.nombre.toLowerCase() === cleanNombre.toLowerCase()
      ) || null;

    const macroId = findMacroregionForProvince(ubicacion.codigoProvincia);

    const report = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tipo,
      severidad: 'Media',
      fecha: new Date().toISOString(),
      municipioAfectado: ubicacion.municipioNombre || 'Ubicación seleccionada',
      provincia: ubicacion.provincia || '—',
      codigoMunicipio: ubicacion.codigoMunicipio || '',
      codigoProvincia: ubicacion.codigoProvincia || '',
      macrorregionId: macroId || null,
      poblacionAfectada: 0,
      duracionDias: 0,
      lugar: ubicacion.lugar || ubicacion.municipioNombre || 'Ubicación seleccionada',
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      descripcion: problema.trim(),
      ilustracion: `/illustrations/${tipo === 'Exceso de basura' ? 'basura' : tipo === 'Inundación' ? 'inundacion' : 'deforestacion'}.svg`,
      denuncianteId: match?.id || `local-${cleanNombre.replace(/\s+/g, '-').toLowerCase()}`,
      denuncianteNombre: cleanNombre,
      denuncianteIniciales: match?.avatarInitials || initials,
      denuncianteColor: match?.avatarColor || color,
      denuncianteVocacion: match?.vocacion || 'Vecino/a de la comunidad',
    };
    onSubmit?.(report);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="denuncia-title"
      className="fixed inset-0 z-50 grid place-items-end md:place-items-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        // Click outside the sheet (on the backdrop) closes the form.
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full md:max-w-lg bg-surface-200 border-t md:border border-white/10 md:rounded-2xl rounded-t-2xl shadow-glow-soft max-h-[92vh] overflow-y-auto thin-scroll">
        {/* Drag handle (mobile) */}
        <div className="md:hidden sticky top-0 bg-surface-200/95 backdrop-blur z-10 pt-2 pb-1">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <header className="px-5 pt-4 pb-3 flex items-start justify-between gap-2 border-b border-white/5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.20em] text-neon-300 font-mono">
              ◆ Reporte ciudadano
            </div>
            <h2 id="denuncia-title" className="text-lg font-bold text-ink-100 mt-0.5">
              Hacer una denuncia
            </h2>
            <p className="text-[11px] text-ink-400 font-mono mt-0.5">
              Tu reporte se publica como alerta ambiental.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 hover:bg-surface-50 rounded-lg h-9 w-9 grid place-items-center transition"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4" noValidate>
          {/* Nombre */}
          <Field label="Tu nombre" error={errors.nombre} required>
            <input
              ref={firstFieldRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Pérez"
              className="input-dark w-full"
              autoComplete="name"
            />
          </Field>

          {/* Tipo */}
          <Field label="Tipo de problema" required>
            <div className="grid grid-cols-3 gap-2">
              {ALERT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`relative rounded-xl border p-2 flex flex-col items-center gap-1 transition overflow-hidden ${
                    tipo === t
                      ? 'border-neon-400/70 bg-neon-500/15 text-neon-200 shadow-glow-soft'
                      : 'border-white/8 bg-surface-300/55 text-ink-300 hover:border-white/20 hover:text-ink-100'
                  }`}
                >
                  <img
                    src={`/illustrations/${t === 'Exceso de basura' ? 'basura' : t === 'Inundación' ? 'inundacion' : 'deforestacion'}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-full object-cover rounded-md"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                    {t}
                  </span>
                  {tipo === t && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-plasma-400 shadow-glow-plasma" />
                  )}
                </button>
              ))}
            </div>
          </Field>

          {/* Problema */}
          <Field
            label="Describe el problema"
            hint={PROBLEMA_PLACEHOLDERS[tipo]}
            error={errors.problema}
            required
          >
            <textarea
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              placeholder={PROBLEMA_PLACEHOLDERS[tipo]}
              rows={4}
              className="input-dark w-full resize-none"
            />
            <div className="mt-1 flex justify-end text-[10px] font-mono text-ink-500">
              {problema.length} / 500
            </div>
          </Field>

          {/* Ubicación — pick on map */}
          <Field label="Ubicación" error={errors.ubicacion} required>
            <p className="text-[10px] text-ink-500 font-mono mb-1.5">
              Toca el mapa para fijar el punto exacto del reporte.
            </p>
            <LocationPicker
              municipios={municipios}
              value={ubicacion}
              onChange={(v) => {
                setUbicacion(v);
                if (errors.ubicacion) setErrors((p) => ({ ...p, ubicacion: undefined }));
              }}
            />
          </Field>

          {/* Submit */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-surface-300/70 px-4 py-3 text-sm font-semibold text-ink-200 hover:bg-surface-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-xl px-4 py-3 text-sm font-bold text-ink-950 shadow-glow-plasma active:scale-[0.98] transition"
              style={{ background: 'linear-gradient(135deg, #B5D33C, #4FB8A2)' }}
            >
              Enviar denuncia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, error, required, children }) {
  return (
    <div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-mono font-bold">
          {label}
          {required && <span className="text-danger-300 ml-1">*</span>}
        </span>
        <div className="mt-1.5">{children}</div>
      </label>
      {hint && !error && (
        <p className="mt-1 text-[10px] text-ink-500 font-mono">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-[10px] text-danger-300 font-mono">⚠ {error}</p>
      )}
    </div>
  );
}
