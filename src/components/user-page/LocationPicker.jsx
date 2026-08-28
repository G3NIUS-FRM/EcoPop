import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { DR_CENTER } from '../../lib/territoryLookup.js';

// LocationPicker — small interactive SVG map of the DR used inside the
// denuncia form to pick the report's location by tapping.
//
// Props:
//   municipios : GeoJSON FeatureCollection of municipios. Used for two things:
//                  1. Drawing the simplified province outlines under the picker.
//                  2. Reverse-geocoding the picked (lat, lng) into the nearest
//                     municipio via point-in-polygon.
//   value      : { lat, lng, lugar, municipioNombre, provincia } | null
//   onChange   : (next) => void   — receives the same shape as `value`.
//
// Visual:
//   • Sea gradient (seaNight palette) + faint wave overlay.
//   • Provinces drawn in surface color with thin neon border.
//   • Picked pin: lime circle + halo, with a vertical drop line.
//   • Crosshair cursor on hover so the user knows the map is interactive.

const PROVINCE_TINT = '#1f4f73';

function bboxFromFeatureCollection(fc) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const c of coords) walk(c);
  };
  for (const f of fc.features || []) {
    if (f.geometry?.coordinates) walk(f.geometry.coordinates);
  }
  if (!isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

// Point-in-polygon for a single ring (no holes handled). Returns true if the
// (lng, lat) point lies inside the polygon defined by the ring.
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Find the municipio containing (lat, lng), or the nearest one by centroid.
function findMunicipio(municipiosGeoJSON, lat, lng) {
  const features = municipiosGeoJSON?.features || [];
  if (!features.length) return null;

  // Pass 1: polygon containment (works for the picked point inside the
  // municipio outer ring).
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      if (pointInRing(lng, lat, g.coordinates[0])) return f;
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        if (pointInRing(lng, lat, poly[0])) return f;
      }
    }
  }

  // Pass 2: nearest centroid fallback. We pick the feature with the smallest
  // great-circle-ish distance to its first-ring centroid.
  let best = null;
  let bestDist = Infinity;
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    let ring;
    if (g.type === 'Polygon') ring = g.coordinates[0];
    else if (g.type === 'MultiPolygon') ring = g.coordinates[0][0];
    else continue;
    let sumLng = 0, sumLat = 0;
    for (const [lng2, lat2] of ring) {
      sumLng += lng2;
      sumLat += lat2;
    }
    const cl = sumLng / ring.length;
    const ca = sumLat / ring.length;
    const d = (cl - lng) ** 2 + (ca - lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

// Format a display name from the matched municipio.
function describe(municipioFeature, lat, lng) {
  const props = municipioFeature?.properties || {};
  const munName = props.NOMBRE || 'Ubicación seleccionada';
  const provName = props.PROVINCIA || 'Provincia desconocida';
  return {
    lugar: `${munName}`,
    municipioNombre: munName,
    provincia: provName,
    codigoMunicipio: String(props.CODONE_MUN || '').padStart(2, '0'),
    codigoProvincia: String(props.CODONE_PRO || '').padStart(2, '0'),
    lat,
    lng,
  };
}

export default function LocationPicker({ municipios, value, onChange }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ width: 320, height: 220 });

  // Track container size so the projection scales with the picker width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Province-level simplified outlines. We don't have the raw province GeoJSON
  // here, so we union all municipio polygons into a single FeatureCollection of
  // pseudo-provinces keyed by `CODONE_PRO`. For picking UX this is enough: the
  // user sees a continuous silhouette of the country, not internal boundaries.
  const provinceFC = useMemo(() => {
    const features = municipios?.features || [];
    const byProv = new Map();
    for (const f of features) {
      const code = String(f.properties?.CODONE_PRO || '').padStart(2, '0');
      if (!code) continue;
      if (!byProv.has(code)) {
        byProv.set(code, {
          type: 'Feature',
          properties: { CODONE_PRO: code, PROVINCIA: f.properties?.PROVINCIA || code },
          geometry: { type: 'MultiPolygon', coordinates: [] },
        });
      }
      const target = byProv.get(code);
      const g = f.geometry;
      if (g?.type === 'Polygon') target.geometry.coordinates.push(g.coordinates);
      else if (g?.type === 'MultiPolygon') target.geometry.coordinates.push(...g.coordinates);
    }
    return { type: 'FeatureCollection', features: [...byProv.values()] };
  }, [municipios]);

  // Projection: fit the DR bbox into the picker viewport with a margin so the
  // outline doesn't touch the edges. We compute scale/translate manually so the
  // projection stays stable on resize.
  const projection = useMemo(() => {
    const bbox = bboxFromFeatureCollection(provinceFC);
    const padding = 14;
    if (!bbox || size.width < 40 || size.height < 40) {
      return geoMercator()
        .center([DR_CENTER[1], DR_CENTER[0]])
        .scale(1500)
        .translate([size.width / 2, size.height / 2]);
    }
    const [[minLng, minLat], [maxLng, maxLat]] = bbox;
    const p = geoMercator()
      .center([DR_CENTER[1], DR_CENTER[0]])
      .translate([0, 0]);
    const [px0, py0] = p([minLng, maxLat]);
    const [px1, py1] = p([maxLng, minLat]);
    const w = Math.max(1, px1 - px0);
    const h = Math.max(1, py1 - py0);
    const sx = (size.width - padding * 2) / w;
    const sy = (size.height - padding * 2) / h;
    const scale = (p.scale() * Math.min(sx, sy)) || 1500;
    return geoMercator()
      .center([DR_CENTER[1], DR_CENTER[0]])
      .scale(scale)
      .translate([size.width / 2, size.height / 2]);
  }, [provinceFC, size.width, size.height]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const provincePaths = useMemo(
    () => provinceFC.features.map((f) => ({ d: pathGen(f), name: f.properties?.PROVINCIA })),
    [provinceFC, pathGen]
  );

  // Convert a tap/click position to (lng, lat) using the projection's inverse.
  //
  // We listen on `pointerdown` rather than `click` because:
  //   1. `click` on mobile/touch is synthesized from touchend and is dropped if
  //      the user moves their finger even a few pixels between touchstart and
  //      touchend — extremely common on a map you want to "tap". `pointerdown`
  //      fires on the initial contact, so the user sees the pin land
  //      immediately.
  //   2. It works uniformly for mouse, pen, and touch without per-device code.
  // We still ignore non-primary buttons (right-click, middle-click) so users
  // can still open the context menu on the map.
  function handlePointerDown(e) {
    // Only react to primary button (left mouse / first touch / pen tip).
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Prefer SVG captured via ref (avoids the React synthetic-event pitfall
    // where `e.currentTarget` can be null after the handler returns).
    const svg = svgRef.current;
    if (!svg) return;

    // Make sure we're acting on the SVG itself, not on a child element (the
    // pin group has `pointer-events="none"`, but be defensive).
    if (e.target !== svg) return;

    // Don't let this pointerdown bubble into the modal backdrop, which would
    // otherwise see a sibling mousedown and could interfere with focus or
    // gesture handling.
    e.stopPropagation();

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inv = projection.invert([x, y]);
    if (!inv || !isFinite(inv[0]) || !isFinite(inv[1])) return;
    const [lng, lat] = inv;
    const match = findMunicipio(municipios, lat, lng);
    const next = match
      ? describe(match, lat, lng)
      : { lugar: 'Ubicación seleccionada', municipioNombre: '', provincia: '', lat, lng };
    onChange?.(next);
  }

  // Screen coords for the picked pin.
  const pin = value && isFinite(value.lat) && isFinite(value.lng)
    ? projection([value.lng, value.lat])
    : null;
  const pinValid = pin && isFinite(pin[0]) && isFinite(pin[1]);

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-white/10 bg-seaNight-900 cursor-crosshair"
        style={{
          // Disable browser scroll/zoom gestures inside the picker so a tap is
          // not consumed by the page or turned into a scroll. We still allow
          // pointer events so taps register immediately.
          touchAction: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          className="block"
          onPointerDown={handlePointerDown}
          role="application"
          aria-label="Mapa para seleccionar ubicación"
        >
          <defs>
            <linearGradient id="lp-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1c2e" />
              <stop offset="100%" stopColor="#143d5c" />
            </linearGradient>
            <pattern id="lp-waves" x="0" y="0" width="60" height="18" patternUnits="userSpaceOnUse">
              <path d="M0 9 Q15 4 30 9 T60 9" stroke="rgba(120,200,255,0.15)" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>

          {/* Sea */}
          <rect width={size.width} height={size.height} fill="url(#lp-sea)" />
          <rect width={size.width} height={size.height} fill="url(#lp-waves)" opacity="0.5" />

          {/* Provinces */}
          <g>
            {provincePaths.map((p, i) =>
              p.d ? (
                <path
                  key={i}
                  d={p.d}
                  fill={PROVINCE_TINT}
                  fillOpacity={0.85}
                  stroke="#5BBC9A"
                  strokeWidth={0.75}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null
            )}
          </g>

          {/* Pick pin */}
          {pinValid && (
            <g pointerEvents="none">
              {/* Drop line */}
              <line
                x1={pin[0]}
                y1={pin[1]}
                x2={pin[0]}
                y2={size.height}
                stroke="#A5CC3F"
                strokeOpacity="0.35"
                strokeDasharray="2 3"
                strokeWidth={1}
              />
              {/* Halo */}
              <circle
                cx={pin[0]}
                cy={pin[1]}
                r={14}
                fill="#A5CC3F"
                fillOpacity="0.18"
              >
                <animate attributeName="r" values="10;16;10" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.30;0.10;0.30" dur="2.2s" repeatCount="indefinite" />
              </circle>
              {/* Pin head */}
              <circle
                cx={pin[0]}
                cy={pin[1]}
                r={6}
                fill="#A5CC3F"
                stroke="#0F1622"
                strokeWidth={1.5}
              />
              <circle cx={pin[0]} cy={pin[1]} r={2} fill="#0F1622" />
            </g>
          )}
        </svg>

        {/* Empty-state hint */}
        {!value && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-[10px] text-neon-300 font-mono uppercase tracking-[0.18em] mb-1">
                ◆ Toca el mapa
              </div>
              <div className="text-[11px] text-ink-300 font-mono">
                para fijar tu ubicación
              </div>
            </div>
          </div>
        )}

        {/* Compass / hint corner */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-[9px] text-ink-300 font-mono uppercase tracking-wider pointer-events-none">
          RD · d3-geo
        </div>
      </div>

      {/* Picked summary */}
      {value && (
        <div className="flex items-start gap-2 text-[11px] font-mono">
          <span className="mt-0.5 h-2 w-2 rounded-full bg-plasma-400 shadow-glow-plasma shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-ink-100 truncate">
              {value.municipioNombre || value.lugar}
              {value.provincia && (
                <span className="text-ink-400"> · {value.provincia}</span>
              )}
            </div>
            <div className="text-ink-500 text-[10px]">
              {value.lat?.toFixed(4)}, {value.lng?.toFixed(4)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange?.(null)}
            className="text-ink-400 hover:text-danger-300 text-[10px] font-mono uppercase tracking-wider px-1.5"
            aria-label="Borrar ubicación"
          >
            ✕ borrar
          </button>
        </div>
      )}
    </div>
  );
}
