import { useMemo, useState } from 'react';
import FilterBar from './FilterBar.jsx';
import { VOCATIONS } from '../lib/territoryLookup.js';

const COLUMNS = [
  { key: 'id', label: 'ID', sortable: true, width: 'w-24' },
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'edad', label: 'Edad', sortable: true, width: 'w-16' },
  { key: 'genero', label: 'Género', sortable: true, width: 'w-16' },
  { key: 'vocacion', label: 'Vocación', sortable: true, width: 'w-32' },
  { key: 'ingresoMensual', label: 'Ingreso', sortable: true, width: 'w-28' },
  { key: 'provincia', label: 'Provincia', sortable: true, width: 'w-40' },
  { key: 'territorioNombre', label: 'Municipio', sortable: true, width: 'w-40' },
  { key: 'fechaRegistro', label: 'Registro', sortable: true, width: 'w-32' },
  { key: 'tieneSeguro', label: 'Seguro', sortable: false, width: 'w-20' },
];

export default function ClientsTable({ clients, allClients, territoryFilter, setTerritoryFilter, options }) {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');

  const cascadedFilters = useMemo(() => {
    const f = { ...filters };
    if (territoryFilter?.level === 'municipio') {
      f.codigoMunicipio = territoryFilter.codigoMunicipio;
    } else if (territoryFilter?.level === 'provincia') {
      f.codigoProvincia = territoryFilter.codigoProvincia;
    } else if (territoryFilter?.level === 'macro') {
      f.macrorregionId = territoryFilter.macrorregionId;
    }
    return f;
  }, [filters, territoryFilter]);

  const filtered = useMemo(() => {
    const list = allClients || clients;
    return list.filter((c) => {
      if (cascadedFilters.search) {
        const q = cascadedFilters.search.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q)) return false;
      }
      if (cascadedFilters.vocacion && c.vocacion !== cascadedFilters.vocacion) return false;
      if (cascadedFilters.edadMin && c.edad < Number(cascadedFilters.edadMin)) return false;
      if (cascadedFilters.edadMax && c.edad > Number(cascadedFilters.edadMax)) return false;
      if (cascadedFilters.codigoMunicipio && c.territorioCodigo !== cascadedFilters.codigoMunicipio) return false;
      if (cascadedFilters.codigoProvincia && c.codigoProvincia !== cascadedFilters.codigoProvincia) return false;
      if (cascadedFilters.macrorregionId && c.macrorregionId !== cascadedFilters.macrorregionId) return false;
      return true;
    });
  }, [allClients, clients, cascadedFilters]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
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
      <div className="border-b border-neon-500/20 px-4 py-3 flex items-center justify-between gap-2 bg-white/40">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] neon-text">◆ Clientes</div>
          <div className="text-[10px] text-ink-600 font-mono mt-0.5">
            {sorted.length.toLocaleString('es-DO')} resultados
          </div>
        </div>
        <div className="flex items-center gap-2">
          {territoryFilter && (
            <span className="badge-neon">
              ◉ {territoryFilter.nombreMunicipio || territoryFilter.nombreProvincia || territoryFilter.nombreMacroregion}
              <button
                onClick={() => setTerritoryFilter(null)}
                className="ml-1.5 text-neon-500 hover:text-danger-400 font-bold"
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

      <div className="px-4 py-2 border-b border-neon-500/15">
        <FilterBar
          filters={filters}
          setFilters={(fn) => setFilters(typeof fn === 'function' ? fn(filters) : fn)}
          options={options}
        />
      </div>

      <div className="overflow-x-auto thin-scroll">
        <table className="min-w-full text-xs">
          <thead className="bg-white/60 text-neon-500 uppercase tracking-wider text-[10px]">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left font-bold border-b border-neon-500/20 ${col.width || ''} ${
                    col.sortable ? 'cursor-pointer hover:text-neon-500' : ''
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
          <tbody className="divide-y divide-neon-500/10">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-ink-600 italic font-mono">
                  No hay clientes que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              pageItems.map((c) => (
                <tr key={c.id} className="hover:bg-neon-500/5 transition">
                  <td className="px-3 py-2 text-ink-500 font-mono text-[10px]">{c.id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-ink-900 font-semibold whitespace-nowrap">{c.nombre}</td>
                  <td className="px-3 py-2 text-ink-800 font-mono">{c.edad}</td>
                  <td className="px-3 py-2 text-ink-800 font-mono">{c.genero}</td>
                  <td className="px-3 py-2 text-ink-800">{c.vocacion}</td>
                  <td className="px-3 py-2 neon-text font-mono font-bold">
                    DOP {c.ingresoMensual.toLocaleString('es-DO')}
                  </td>
                  <td className="px-3 py-2 text-ink-700">{c.provincia}</td>
                  <td className="px-3 py-2 text-ink-700">{c.territorioNombre}</td>
                  <td className="px-3 py-2 text-ink-600 font-mono">
                    {new Date(c.fechaRegistro).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-3 py-2">
                    {c.tieneSeguro ? (
                      <span className="badge-neon">Sí</span>
                    ) : (
                      <span className="text-ink-500 text-[10px] font-mono">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-neon-500/15 text-xs text-ink-700 font-mono">
        <span>
          Página <span className="neon-text">{safePage + 1}</span> / {pageCount}
        </span>
        <div className="flex gap-1">
          <button
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-neon-500/30 px-3 py-1 text-neon-500 hover:bg-neon-500/20 hover:border-neon-400 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            ◀ Anterior
          </button>
          <button
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded border border-neon-500/30 px-3 py-1 text-neon-500 hover:bg-neon-500/20 hover:border-neon-400 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            Siguiente ▶
          </button>
        </div>
      </div>
    </div>
  );
}