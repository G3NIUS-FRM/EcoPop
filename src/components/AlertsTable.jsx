import { useMemo, useState } from 'react';
import FilterBar from './FilterBar.jsx';
import { ALERT_TYPES, SEVERITIES } from '../lib/territoryLookup.js';

const COLUMNS = [
  { key: 'fecha', label: 'Fecha', sortable: true, width: 'w-28' },
  { key: 'tipo', label: 'Tipo', sortable: true, width: 'w-32' },
  { key: 'severidad', label: 'Severidad', sortable: true, width: 'w-24' },
  { key: 'lugar', label: 'Lugar', sortable: true, width: 'w-44' },
  { key: 'municipioAfectado', label: 'Municipio', sortable: true, width: 'w-40' },
  { key: 'provincia', label: 'Provincia', sortable: true, width: 'w-40' },
  { key: 'poblacionAfectada', label: 'Pob. Afectada', sortable: true, width: 'w-32' },
  { key: 'duracionDias', label: 'Duración', sortable: true, width: 'w-24' },
  { key: 'descripcion', label: 'Descripción', sortable: false },
];

const SEV_CLASS = {
  Baja: 'sev-Baja',
  Media: 'sev-Media',
  Alta: 'sev-Alta',
  Crítica: 'sev-Critica',
};

const TYPE_ICON = {
  'Exceso de basura': '🗑',
  'Inundación': '💧',
  'Deforestación': '🌳',
};

export default function AlertsTable({ events, territoryFilter, setTerritoryFilter, options }) {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');

  const cascaded = useMemo(() => {
    const f = { ...filters };
    if (territoryFilter?.level === 'municipio') f.codigoMunicipio = territoryFilter.codigoMunicipio;
    else if (territoryFilter?.level === 'provincia') f.codigoProvincia = territoryFilter.codigoProvincia;
    return f;
  }, [filters, territoryFilter]);

  const filtered = useMemo(() => {
    return (events || []).filter((e) => {
      if (cascaded.search) {
        const q = cascaded.search.toLowerCase();
        const hay = `${e.lugar || ''} ${e.municipioAfectado} ${e.provincia} ${e.descripcion}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cascaded.type && e.tipo !== cascaded.type) return false;
      if (cascaded.severidad && e.severidad !== cascaded.severidad) return false;
      if (cascaded.fechaMin && new Date(e.fecha) < new Date(cascaded.fechaMin)) return false;
      if (cascaded.fechaMax && new Date(e.fecha) > new Date(cascaded.fechaMax + 'T23:59:59')) return false;
      if (cascaded.codigoMunicipio && e.codigoMunicipio !== cascaded.codigoMunicipio) return false;
      if (cascaded.codigoProvincia && e.codigoProvincia !== cascaded.codigoProvincia) return false;
      return true;
    });
  }, [events, cascaded]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="border-b border-white/8 px-4 py-3 flex items-center justify-between gap-2 bg-surface-200/55">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] neon-text">◆ Alertas Ambientales</div>
          <div className="text-[10px] text-ink-400 font-mono mt-0.5">
            {sorted.length.toLocaleString('es-DO')} alertas geo-localizadas
          </div>
        </div>
        <div className="flex items-center gap-2">
          {territoryFilter && (
            <span className="badge-neon">
              ◉ {territoryFilter.nombreMunicipio || territoryFilter.nombreProvincia}
              <button
                onClick={() => setTerritoryFilter(null)}
                className="ml-1.5 text-neon-300 hover:text-danger-300 font-bold"
                title="Limpiar filtro"
              >
                ×
              </button>
            </span>
          )}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="input-dark"
          >
            <option value={25}>25 / pág</option>
            <option value={50}>50 / pág</option>
            <option value={100}>100 / pág</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-white/5">
        <FilterBar
          filters={{
            ...filters,
            showVocation: false,
            showAgeRange: false,
            showCascade: false,
            types: ALERT_TYPES,
            severities: SEVERITIES,
          }}
          setFilters={(fn) => setFilters(typeof fn === 'function' ? fn(filters) : fn)}
          options={options}
        />
      </div>

      <div className="overflow-x-auto thin-scroll">
        <table className="min-w-full text-xs">
          <thead className="bg-surface-300/70 text-neon-300 uppercase tracking-wider text-[10px]">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left font-bold border-b border-white/8 ${col.width || ''} ${
                    col.sortable ? 'cursor-pointer hover:text-plasma-400' : ''
                  }`}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 neon-text">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-ink-400 italic font-mono">
                  No hay alertas que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((e) => (
                <tr key={e.id} className="hover:bg-neon-500/10 transition">
                  <td className="px-3 py-2 text-ink-300 font-mono">
                    {new Date(e.fecha).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-3 py-2 font-semibold text-ink-100">
                    <span className="mr-1">{TYPE_ICON[e.tipo] || '◆'}</span>
                    {e.tipo}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        SEV_CLASS[e.severidad]
                      }`}
                    >
                      {e.severidad}
                    </span>
                  </td>
                  <td className="px-3 py-2 neon-text-plasma font-mono text-[11px]">◉ {e.lugar}</td>
                  <td className="px-3 py-2 text-ink-200">{e.municipioAfectado}</td>
                  <td className="px-3 py-2 text-ink-200">{e.provincia}</td>
                  <td className="px-3 py-2 text-ink-100 font-mono">
                    {e.poblacionAfectada.toLocaleString('es-DO')}
                  </td>
                  <td className="px-3 py-2 text-ink-300 font-mono">{e.duracionDias}d</td>
                  <td className="px-3 py-2 text-ink-300 max-w-md">{e.descripcion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 text-xs text-ink-200 font-mono">
        <span>
          Página <span className="neon-text">{safePage + 1}</span> / {pageCount}
        </span>
        <div className="flex gap-1">
          <button
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-white/10 px-3 py-1 text-ink-200 hover:bg-surface-50 hover:text-ink-100 hover:border-neon-500/40 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            ◀ Anterior
          </button>
          <button
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded border border-white/10 px-3 py-1 text-ink-200 hover:bg-surface-50 hover:text-ink-100 hover:border-neon-500/40 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            Siguiente ▶
          </button>
        </div>
      </div>
    </div>
  );
}