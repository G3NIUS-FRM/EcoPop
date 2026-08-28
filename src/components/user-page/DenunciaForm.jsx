import { useState, useEffect, useRef } from 'react';
import { ALERT_TYPES } from '../../lib/territoryLookup.js';

// DenunciaForm — modal-style form for end-users to file a new environmental
// report. Captures: nombre, tipo (radio cards), problema (textarea), evidencia
// (image / video upload as evidence). On submit it requests the device's
// geolocation via the browser Geolocation API (with consent shown to the
// user via the in-form notice) and produces a new alert with the user's name
// as `denuncianteNombre` and an `avatarColor` derived from their name hash.
//
// Form state is fully controlled and validated client-side. We don't have a
// backend so the new alert is appended to local state via the onSubmit callback
// and surfaced through the UserPage feed.

const PROBLEMA_PLACEHOLDERS = {
  'Exceso de basura':
    'Describe el vertedero o acumulación (tamaño, olor, días sin recolección…)',
  'Inundación':
    '¿Qué zonas están anegadas? ¿Hay personas o cultivos afectados?',
  'Deforestación':
    '¿Dónde están talando? ¿Hay maquinaria pesada o quema?',
};

// Limits for the evidence uploader. We keep these conservative because the
// files end up encoded as data URLs in memory (no backend upload).
const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ACCEPT_MIME = 'image/*,video/*';

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

// File picker helper. Reads each File as a data URL so the preview + payload
// survive React re-renders and (optionally) localStorage round-trips.
function fileToEvidence(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        kind: file.type.startsWith('video/') ? 'video' : 'image',
        dataUrl: reader.result,
      });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DenunciaForm({
  open,
  onClose,
  onSubmit,
  existingClients = [],
  existingDenouncers = [],
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState(ALERT_TYPES[0]);
  const [problema, setProblema] = useState('');
  const [evidencia, setEvidencia] = useState([]); // [{ id, name, size, type, kind, dataUrl }]
  const [evidenciaError, setEvidenciaError] = useState('');
  const [errors, setErrors] = useState({});
  const [requestingLocation, setRequestingLocation] = useState(false);
  const firstFieldRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset + autofocus when the modal opens.
  useEffect(() => {
    if (open) {
      setErrors({});
      setEvidenciaError('');
      setEvidencia([]);
      setRequestingLocation(false);
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
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Browser Geolocation API wrapper. Resolves with { lat, lng } or rejects
  // with an Error whose message describes the failure (denied / unavailable /
  // timeout). We expose the same shape `describe()` used to produce so the
  // report downstream still gets every field it expects.
  function requestGeolocation({ timeoutMs = 10000 } = {}) {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocalización no soportada en este navegador.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => {
          const msg =
            err.code === 1
              ? 'Permiso de ubicación denegado. Concede acceso para enviar la denuncia.'
              : err.code === 2
              ? 'No se pudo determinar tu ubicación.'
              : err.code === 3
              ? 'La solicitud de ubicación tardó demasiado.'
              : 'Error desconocido al obtener la ubicación.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
      );
    });
  }

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    setEvidenciaError('');

    // Per-file validation: type + size. We bail early on the first violation so
    // the user gets a clear message instead of a silent partial upload.
    const remainingSlots = MAX_FILES - evidencia.length;
    if (incoming.length > remainingSlots) {
      setEvidenciaError(
        `Máximo ${MAX_FILES} archivos. Puedes agregar ${remainingSlots} más.`
      );
      return;
    }

    for (const f of incoming) {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        setEvidenciaError(`"${f.name}" no es imagen ni video.`);
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        setEvidenciaError(
          `"${f.name}" pesa ${fmtSize(f.size)} — máximo ${fmtSize(MAX_FILE_BYTES)}.`
        );
        return;
      }
    }

    const decoded = await Promise.all(incoming.map(fileToEvidence));
    setEvidencia((prev) => [...prev, ...decoded.filter(Boolean)]);
  }

  function handlePickFiles(e) {
    handleFiles(e.target.files);
    // Reset the input so picking the same file twice still fires onChange.
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  function removeEvidence(id) {
    setEvidencia((prev) => prev.filter((e) => e.id !== id));
    setEvidenciaError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setRequestingLocation(true);
    setErrors((p) => ({ ...p, ubicacion: undefined }));

    let coords;
    try {
      coords = await requestGeolocation();
    } catch (geoErr) {
      setRequestingLocation(false);
      setErrors((p) => ({ ...p, ubicacion: geoErr.message }));
      return;
    }

    const cleanNombre = nombre.trim();
    const color = colorFromName(cleanNombre);
    const initials = initialsFromName(cleanNombre);

    // Try to match an existing denouncer by name to keep avatar / vocation
    // consistent across the feed. Otherwise we attach fresh avatar metadata.
    const match =
      existingDenouncers.find(
        (c) => c.nombre.toLowerCase() === cleanNombre.toLowerCase()
      ) || null;

    const report = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tipo,
      severidad: 'Media',
      fecha: new Date().toISOString(),
      municipioAfectado: 'Ubicación aproximada',
      provincia: '—',
      codigoMunicipio: '',
      codigoProvincia: '',
      macrorregionId: null,
      poblacionAfectada: 0,
      duracionDias: 0,
      lugar: 'Ubicación aproximada',
      lat: coords.lat,
      lng: coords.lng,
      precisionMetros: coords.accuracy ?? null,
      descripcion: problema.trim(),
      ilustracion: `/illustrations/${tipo === 'Exceso de basura' ? 'basura' : tipo === 'Inundación' ? 'inundacion' : 'deforestacion'}.svg`,
      // Multimedia evidence — array of { id, name, type, kind, size, dataUrl }.
      evidencia: evidencia.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        kind: e.kind,
        size: e.size,
        dataUrl: e.dataUrl,
      })),
      denuncianteId: match?.id || `local-${cleanNombre.replace(/\s+/g, '-').toLowerCase()}`,
      denuncianteNombre: cleanNombre,
      denuncianteIniciales: match?.avatarInitials || initials,
      denuncianteColor: match?.avatarColor || color,
      denuncianteVocacion: match?.vocacion || 'Vecino/a de la comunidad',
    };
    setRequestingLocation(false);
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

          {/* Evidencia — multimedia upload */}
          <Field
            label="Evidencia"
            hint={`Imágenes o videos (opcional · máx ${MAX_FILES}, ${fmtSize(MAX_FILE_BYTES)} c/u).`}
            error={evidenciaError}
          >
            {/* Drop zone + native file picker. */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative rounded-xl border-2 border-dashed border-white/15 bg-surface-300/40 hover:border-neon-400/50 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_MIME}
                multiple
                onChange={handlePickFiles}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Subir evidencia (imágenes o videos)"
                disabled={evidencia.length >= MAX_FILES}
              />
              <div className="px-4 py-5 flex flex-col items-center justify-center text-center gap-1 pointer-events-none">
                <div
                  className="h-10 w-10 rounded-full grid place-items-center mb-1"
                  style={{
                    background: 'linear-gradient(135deg, rgba(91,188,154,0.18), rgba(165,204,63,0.18))',
                    border: '1px solid rgba(165,204,63,0.35)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#A5CC3F" strokeWidth="1.6" className="h-5 w-5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 8l-5-5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 3v12" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-[12px] font-semibold text-ink-100">
                  Subir fotos o videos
                </div>
                <div className="text-[10px] text-ink-400 font-mono">
                  Toca o arrastra archivos aquí · {evidencia.length}/{MAX_FILES}
                </div>
              </div>
            </div>

            {/* Thumbnail grid */}
            {evidencia.length > 0 && (
              <ul className="mt-2 grid grid-cols-4 gap-2">
                {evidencia.map((e) => (
                  <li
                    key={e.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-surface-300/60 group"
                  >
                    {e.kind === 'video' ? (
                      <video
                        src={e.dataUrl}
                        className="absolute inset-0 h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={e.dataUrl}
                        alt={e.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    {e.kind === 'video' && (
                      <span className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-ink-100">
                        ▶ Video
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEvidence(e.id)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 hover:bg-danger-500/80 text-ink-100 grid place-items-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                      aria-label={`Quitar ${e.name}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                        <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                      </svg>
                    </button>
                    <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent text-[9px] text-ink-100 truncate">
                      {fmtSize(e.size)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {/* Ubicación — big consent notice */}
          <div
            className="relative rounded-2xl border border-neon-400/40 bg-gradient-to-br from-neon-500/10 via-surface-300/60 to-plasma-500/10 p-5 shadow-glow-soft"
            role="note"
            aria-label="Aviso de uso de ubicación"
          >
            <div className="flex items-start gap-4">
              <div
                className="shrink-0 h-12 w-12 rounded-2xl grid place-items-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(91,188,154,0.30), rgba(165,204,63,0.30))',
                  border: '1px solid rgba(165,204,63,0.45)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A5CC3F"
                  strokeWidth="1.6"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="9" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.20em] text-neon-300 font-mono font-bold">
                  ◆ Aviso de privacidad
                </div>
                <h3 className="text-[18px] sm:text-[20px] font-bold text-ink-100 leading-tight mt-1">
                  Tu ubicación va a ser utilizada
                </h3>
                <p className="text-[12px] text-ink-300 mt-1.5 leading-relaxed">
                  Al enviar este reporte, el sistema solicitará tu ubicación
                  aproximada para ubicar el caso en el mapa y ayudar a las
                  autoridades y a tu comunidad. No se comparte con terceros.
                </p>
                {requestingLocation && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-neon-300 font-mono">
                    <span className="inline-block h-2 w-2 rounded-full bg-neon-300 animate-pulse" />
                    Solicitando permiso de ubicación…
                  </div>
                )}
                {errors.ubicacion && !requestingLocation && (
                  <div className="mt-3 text-[11px] text-danger-300 font-mono">
                    ⚠ {errors.ubicacion}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={requestingLocation}
              className="flex-1 rounded-xl border border-white/10 bg-surface-300/70 px-4 py-3 text-sm font-semibold text-ink-200 hover:bg-surface-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={requestingLocation}
              className="flex-[2] rounded-xl px-4 py-3 text-sm font-bold text-ink-950 shadow-glow-plasma active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-wait"
              style={{ background: 'linear-gradient(135deg, #B5D33C, #4FB8A2)' }}
            >
              {requestingLocation ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-ink-950 animate-pulse" />
                  Obteniendo ubicación…
                </span>
              ) : (
                'Enviar denuncia'
              )}
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
