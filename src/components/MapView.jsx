import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoMercator, geoPath, geoGraticule10 } from 'd3-geo';
import { useDashboard } from '../context/DashboardContext.jsx';
import {
  DR_CENTER,
  HEAT_COLORS,
  HEAT_RADIUS,
  SEVERITY_COLOR,
} from '../lib/territoryLookup.js';

// Zoom & fit tuning constants
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 10;
const FIT_FILL = 0.65;
// Heatmap blobs look better above this zoom — below it, render a denser,
// smaller core so the country silhouette stays readable.
const HEAT_DETAIL_MIN_K = 0.45;

// Viewport-culling helper exported for unit testing.
// Returns true if the projected bbox of a feature intersects the visible viewport
// rectangle (after pan/zoom transform). bbox is in projection units; we transform
// it into screen units using view.{x,y,k}, then intersect with the viewport rect.
export function featureInViewport(bbox, view, size) {
  if (!bbox || !isFinite(bbox[0][0])) return false;
  const [[x0, y0], [x1, y1]] = bbox;
  const sx0 = x0 * view.k + view.x;
  const sy0 = y0 * view.k + view.y;
  const sx1 = x1 * view.k + view.x;
  const sy1 = y1 * view.k + view.y;
  // Add a 20px margin so partially-visible features still render
  const M = 20;
  return !(sx1 < -M || sx0 > size.width + M || sy1 < -M || sy0 > size.height + M);
}

export default function MapView({ data, clients }) {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs for high-frequency state we don't want to trigger renders
  const dragRef = useRef(null);
  const wheelRafRef = useRef(null);
  const viewRef = useRef(view);
  const hoveredRef = useRef(null);
  const pathRefs = useRef(new Map());
  const hoveredPathEl = useRef(null);

  viewRef.current = view;

  const {
    selectedTerritory,
    setSelectedTerritory,
    showEvents,
    setShowEvents,
    setHoveredTerritory,
  } = useDashboard();

  // MapView is locked to provincia level (per product decision: heatmap is the
  // primary visualization, and alerts are already at coordinate precision, so
  // aggregated views are not needed).
  const provincias = data?.provincias;
  const alerts = data?.events || [];

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Projection
  const projection = useMemo(() => {
    return geoMercator()
      .center([DR_CENTER[1], DR_CENTER[0]])
      .scale(5500)
      .translate([size.width / 2, size.height / 2]);
  }, [size.width, size.height]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const graticulePath = useMemo(() => pathGen(geoGraticule10()), [pathGen]);

  // Alerts indexed by provincia code (for sidebar counts and featureData metadata)
  const alertIndex = useMemo(() => {
    const byProvincia = new Map();
    for (const a of alerts) {
      if (!a.codigoProvincia) continue;
      if (!byProvincia.has(a.codigoProvincia)) byProvincia.set(a.codigoProvincia, []);
      byProvincia.get(a.codigoProvincia).push(a);
    }
    return { byProvincia };
  }, [alerts]);

  const clientCountByProv = useMemo(() => {
    const m = new Map();
    for (const c of clients || []) {
      m.set(c.codigoProvincia, (m.get(c.codigoProvincia) || 0) + 1);
    }
    return m;
  }, [clients]);

  // Province polygons with cached bbox for viewport culling
  const featureData = useMemo(() => {
    if (!provincias?.features) return [];
    return provincias.features.map((f, idx) => {
      const props = f.properties || {};
      const code = String(props.PROV_COD || '').padStart(2, '0');
      const name = props.PROV_NOM;
      const evs = alertIndex.byProvincia.get(code) || [];
      const bbox = pathGen.bounds(f);
      return {
        idx,
        d: pathGen(f),
        bbox,
        code,
        name,
        levelName: 'provincia',
        evCount: evs.length,
        clientCount: clientCountByProv.get(code) || 0,
        props,
        feature: f,
      };
    });
  }, [provincias, pathGen, alertIndex, clientCountByProv]);

  // Viewport-culled features
  const visibleFeatures = useMemo(() => {
    if (size.width < 10) return featureData;
    return featureData.filter((fd) => featureInViewport(fd.bbox, view, size));
  }, [featureData, view, size]);

  function isSelected(fd) {
    if (!selectedTerritory) return false;
    return selectedTerritory.codigoProvincia === fd.code;
  }

  // Heatmap blobs — each alert renders as a soft radial-gradient circle at its
  // (lat, lng) coordinates. Overlapping blobs blend via mix-blend-mode:multiply,
  // creating organic "hot spots" where alerts cluster.
  const heatmapPoints = useMemo(() => {
    if (!showEvents) return [];
    return alerts
      .filter((a) => typeof a.lat === 'number' && typeof a.lng === 'number')
      .map((a) => {
        const [x, y] = projection([a.lng, a.lat]);
        if (!isFinite(x) || !isFinite(y)) return null;
        return {
          id: a.id,
          x,
          y,
          severity: a.severidad,
          tipo: a.tipo,
          lugar: a.lugar,
          municipio: a.municipioAfectado,
          provincia: a.provincia,
          fecha: a.fecha,
          poblacionAfectada: a.poblacionAfectada,
        };
      })
      .filter(Boolean);
  }, [alerts, projection, showEvents]);

  // Viewport-cull the heatmap points (radius grows with severity)
  const visibleHeatPoints = useMemo(() => {
    if (size.width < 10) return heatmapPoints;
    const M = 60;
    return heatmapPoints.filter((p) => {
      const sx = p.x * view.k + view.x;
      const sy = p.y * view.k + view.y;
      const sr = (HEAT_RADIUS[p.severity] || 70) * view.k + M;
      return sx + sr > -M && sx - sr < size.width + M &&
             sy + sr > -M && sy - sr < size.height + M;
    });
  }, [heatmapPoints, view, size]);

  // ---------- Fit to a feature ----------
  const fitToFeature = useCallback(
    (feature) => {
      const b = pathGen.bounds(feature);
      if (!b || !isFinite(b[0][0])) return;
      const [[x0, y0], [x1, y1]] = b;
      const w = Math.max(1, x1 - x0);
      const h = Math.max(1, y1 - y0);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const availW = size.width * FIT_FILL;
      const availH = size.height * FIT_FILL;
      const computedK = Math.min(availW / w, availH / h);
      const newK = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, computedK));
      setView({
        k: newK,
        x: size.width / 2 - cx * newK,
        y: size.height / 2 - cy * newK,
      });
    },
    [pathGen, size.width, size.height]
  );

  // Initial fit (and on container resize)
  useEffect(() => {
    if (!provincias?.features?.length) return;
    if (size.width < 10) return;
    fitToFeature({ type: 'FeatureCollection', features: provincias.features });
  }, [provincias, size.width, fitToFeature]);

  // ---------- Wheel handler with rAF throttle ----------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (wheelRafRef.current) return;
    wheelRafRef.current = requestAnimationFrame(() => {
      wheelRafRef.current = null;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      const v = viewRef.current;
      const newK = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.k * factor));
      const ratio = newK / v.k;
      setView({
        k: newK,
        x: mx - (mx - v.x) * ratio,
        y: my - (my - v.y) * ratio,
      });
    });
  }, []);

  // ---------- Mouse / drag ----------
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, view: { ...viewRef.current } };
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (tooltipRef.current && hoveredRef.current) {
        const tx = Math.min(mx + 14, size.width - 240);
        const ty = Math.min(my + 14, size.height - 110);
        tooltipRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
      }

      if (!isDragging || !dragRef.current) return;
      const { startX, startY, view: v0 } = dragRef.current;
      setView({
        k: v0.k,
        x: v0.x + (e.clientX - startX),
        y: v0.y + (e.clientY - startY),
      });
    },
    [isDragging, size.width, size.height]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // ---------- Feature interactions ----------
  function handleFeatureClick(fd) {
    // Double-click on the same province = deselect (toggle off).
    // Single click on a different province = select it.
    const current = selectedTerritory;
    const isSame =
      current &&
      current.level === 'provincia' &&
      current.codigoProvincia === fd.code;

    if (isSame) {
      setSelectedTerritory(null);
    } else {
      setSelectedTerritory({
        level: 'provincia',
        codigoProvincia: fd.code,
        nombreProvincia: fd.name,
      });
      fitToFeature(fd.feature);
    }
  }

  function handleFeatureHover(fd) {
    hoveredRef.current = fd;
    if (hoveredPathEl.current && hoveredPathEl.current !== pathRefs.current.get(fd.code)) {
      hoveredPathEl.current.classList.remove('is-hovered');
    }
    const el = pathRefs.current.get(fd.code);
    if (el) {
      el.classList.add('is-hovered');
      hoveredPathEl.current = el;
    }
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'block';
      const nameEl = tooltipRef.current.querySelector('[data-tt="name"]');
      const levelEl = tooltipRef.current.querySelector('[data-tt="level"]');
      const evEl = tooltipRef.current.querySelector('[data-tt="ev"]');
      const clEl = tooltipRef.current.querySelector('[data-tt="cl"]');
      const clRow = tooltipRef.current.querySelector('[data-tt="clrow"]');
      if (nameEl) nameEl.textContent = fd.name;
      if (levelEl) levelEl.textContent = 'provincia';
      if (evEl) evEl.textContent = fd.evCount;
      if (clEl) clEl.textContent = fd.clientCount || 0;
      if (clRow) clRow.style.display = '';
    }
    setHoveredTerritory({ level: 'provincia', name: fd.name });
  }

  function handleFeatureLeave(fd) {
    hoveredRef.current = null;
    const el = fd ? pathRefs.current.get(fd.code) : hoveredPathEl.current;
    if (el) {
      el.classList.remove('is-hovered');
      if (el === hoveredPathEl.current) hoveredPathEl.current = null;
    }
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    setHoveredTerritory(null);
  }

  function resetView() {
    if (provincias?.features?.length) {
      fitToFeature({ type: 'FeatureCollection', features: provincias.features });
    } else {
      setView({ x: 0, y: 0, k: 1 });
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        width={size.width}
        height={size.height}
        className="block select-none"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Caribbean blue sea */}
          <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#cfe9f5" />
            <stop offset="35%"  stopColor="#7cc4e8" />
            <stop offset="70%"  stopColor="#3498db" />
            <stop offset="100%" stopColor="#1f6fa5" />
          </linearGradient>

          {/* Ocean waves */}
          <pattern id="waves" x="0" y="0" width="80" height="24" patternUnits="userSpaceOnUse">
            <path d="M0 12 Q20 4 40 12 T80 12" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" fill="none" />
            <path d="M0 18 Q20 10 40 18 T80 18" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" fill="none" />
          </pattern>

          {/* Heatmap radial gradients — one per severity. Mix-blend-mode:multiply
              in the parent <g> makes overlapping blobs blend into hotter zones. */}
          {Object.entries(HEAT_COLORS).map(([sev, color]) => (
            <radialGradient key={`heat-${sev}`} id={`heat-${sev}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.85" />
              <stop offset="35%"  stopColor={color} stopOpacity="0.55" />
              <stop offset="70%"  stopColor={color} stopOpacity="0.20" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}

          {/* Subtle blur filter to smooth the heatmap at low zoom */}
          <filter id="heat-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Sea */}
        <rect width={size.width} height={size.height} fill="url(#seaGrad)" />
        <rect width={size.width} height={size.height} fill="url(#waves)" opacity="0.7" />

        {/* Pan/zoom group */}
        <g
          transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}
          style={{ willChange: 'transform' }}
        >
          {/* Lat/lng graticule */}
          <path
            d={graticulePath}
            fill="none"
            stroke="rgba(31, 111, 165, 0.25)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />

          {/* Province polygons (viewport-culled) */}
          {visibleFeatures.map((fd) => {
            const selected = isSelected(fd);
            return (
              <path
                key={`feat-prov-${fd.code}`}
                ref={(el) => {
                  if (el) pathRefs.current.set(fd.code, el);
                  else pathRefs.current.delete(fd.code);
                }}
                d={fd.d}
                fill="#f1f5f9"
                fillOpacity={selected ? 0.88 : 0.82}
                stroke={selected ? '#A5CC3F' : '#0E4D3A'}
                strokeWidth={selected ? 2.5 : 1}
                vectorEffect="non-scaling-stroke"
                className={`feat-path cursor-pointer ${selected ? 'is-selected' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFeatureClick(fd);
                }}
                onMouseEnter={() => handleFeatureHover(fd)}
                onMouseLeave={() => handleFeatureLeave(fd)}
              />
            );
          })}

          {/* Heatmap — alerts rendered as soft radial-gradient circles at their
              (lat, lng) coordinates. NO per-province aggregation here: the visual
              intensity comes purely from how many alert points cluster in an area. */}
          <g style={{ mixBlendMode: 'multiply' }} filter="url(#heat-blur)" pointerEvents="none">
            {visibleHeatPoints.map((p) => {
              const r = HEAT_RADIUS[p.severity] || 70;
              return (
                <circle
                  key={`heat-${p.id}`}
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={`url(#heat-${p.severity})`}
                />
              );
            })}
          </g>

          {/* Heatmap core dots — small intense markers showing exact alert locations.
              Only visible when zoomed in enough to make them readable. */}
          {showEvents && view.k >= HEAT_DETAIL_MIN_K && (
            <g pointerEvents="none">
              {visibleHeatPoints.map((p) => {
                const color = SEVERITY_COLOR[p.severity] || '#f97316';
                return (
                  <circle
                    key={`core-${p.id}`}
                    cx={p.x}
                    cy={p.y}
                    r={4 / view.k}
                    fill={color}
                    fillOpacity={0.9}
                    stroke="#ffffff"
                    strokeWidth={1.2 / view.k}
                  >
                    <title>{`${p.tipo} · ${p.severity} · ${p.lugar}`}</title>
                  </circle>
                );
              })}
            </g>
          )}
        </g>
      </svg>

      {/* HUD top-left */}
      <div className="absolute left-3 top-3 z-10 glass rounded-lg px-3 py-2 text-xs w-52">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-500 animate-pulse-soft shadow-glow-soft" />
          <span className="font-bold text-neon-500 tracking-wider text-[10px]">Mapa de calor</span>
        </div>

        {/* Toggle heatmap visibility */}
        <div className="flex items-center justify-between pointer-events-auto">
          <span className="text-ink-700 text-[11px] font-medium">Heatmap</span>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showEvents}
              onChange={(e) => setShowEvents(e.target.checked)}
              className="sr-only peer"
            />
            <span className="toggle-dark" />
          </label>
        </div>

        <div className="mt-3 pt-2 border-t border-ink-200">
          <div className="flex items-center gap-2">
            <span className="text-ink-500 text-[10px] uppercase tracking-wider">Zoom</span>
            <span className="text-ink-800 font-mono">{view.k.toFixed(2)}x</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-ink-500 text-[10px] uppercase tracking-wider">Alertas</span>
            <span className="text-neon-500 font-mono">{alerts.length}</span>
          </div>
          <button
            onClick={resetView}
            className="mt-2 w-full rounded border border-ink-200 bg-white px-2 py-1 text-[10px] text-neon-500 hover:bg-neon-50 hover:border-neon-400 transition font-mono"
          >
            ⟲ Reencuadrar
          </button>
        </div>
      </div>

      {/* Heatmap legend (bottom-right) */}
      <div className="pointer-events-none absolute right-3 bottom-3 z-10 glass rounded-lg px-3 py-2 text-[11px]">
        <div className="font-bold text-neon-500 tracking-wider text-[10px] mb-1.5">
          ◉ Severidad
        </div>
        {Object.entries(SEVERITY_COLOR).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-2 mb-0.5">
            <span
              className="w-4 h-3 rounded-sm border border-ink-200"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
            <span className="text-ink-700 font-mono text-[10px]">{sev}</span>
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      <div
        ref={tooltipRef}
        className="absolute top-0 left-0 z-20 glass-strong rounded-lg px-3 py-2 text-xs shadow-glow-soft pointer-events-none"
        style={{ display: 'none', transform: 'translate(-9999px, -9999px)' }}
      >
        <div className="font-bold text-neon-500" data-tt="name">—</div>
        <div className="text-ink-500 text-[10px] mt-0.5 font-mono uppercase tracking-wider" data-tt="level">—</div>
        <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
          <span className="text-neon-500">◆ <span data-tt="ev">0</span></span>
          <span className="text-ink-500">alertas</span>
          <span data-tt="clrow">
            <span className="text-ink-500 ml-1">·</span>
            <span className="text-neon-500 ml-1">◉ <span data-tt="cl">0</span></span>
            <span className="text-ink-500 ml-1">clientes</span>
          </span>
        </div>
      </div>

      {/* Hint top-right */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 glass-soft rounded-md px-2.5 py-1 text-[10px] text-ink-600 font-mono tracking-wider">
        Arrastra · Rueda zoom · 2× click deselecciona
      </div>
    </div>
  );
}
