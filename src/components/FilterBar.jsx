import { useMemo } from 'react';
import { VOCATIONS, MACRO_TO_PROVINCES } from '../lib/territoryLookup.js';

export default function FilterBar({ filters, setFilters, options }) {
  const { macroList, provinciaList, municipioList } = options || {};
  const update = (k, v) => setFilters((prev) => ({ ...prev, [k]: v }));

  const macroOptions = useMemo(() => {
    if (macroList?.length) return macroList;
    return Object.keys(MACRO_TO_PROVINCES);
  }, [macroList]);

  return (
    <div className="glass-soft rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-neon-500 text-[10px] uppercase tracking-[0.18em] font-bold mr-1">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-400 animate-pulse-soft shadow-glow-soft" />
        Filtros
      </div>

      <input
        type="text"
        value={filters.search || ''}
        onChange={(e) => update('search', e.target.value)}
        placeholder="🔍 Buscar..."
        className="input-dark w-44"
      />

      {filters.showVocation !== false && (
        <select
          value={filters.vocacion || ''}
          onChange={(e) => update('vocacion', e.target.value)}
          className="input-dark"
        >
          <option value="">Todas las vocaciones</option>
          {VOCATIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      )}

      {filters.showAgeRange !== false && (
        <>
          <input
            type="number"
            min={0}
            max={120}
            placeholder="Edad min"
            value={filters.edadMin ?? ''}
            onChange={(e) => update('edadMin', e.target.value)}
            className="input-dark w-20"
          />
          <input
            type="number"
            min={0}
            max={120}
            placeholder="Edad max"
            value={filters.edadMax ?? ''}
            onChange={(e) => update('edadMax', e.target.value)}
            className="input-dark w-20"
          />
        </>
      )}

      {filters.showCascade !== false && (
        <>
          <select
            value={filters.macrorregionId || ''}
            onChange={(e) => update('macrorregionId', e.target.value)}
            className="input-dark"
          >
            <option value="">Macroregión</option>
            {macroOptions.map((m) => (
              <option key={m.id || m} value={m.id || m}>{m.name || m}</option>
            ))}
          </select>
          <select
            value={filters.codigoProvincia || ''}
            onChange={(e) => update('codigoProvincia', e.target.value)}
            className="input-dark"
            disabled={!filters.macrorregionId && !(provinciaList?.length)}
          >
            <option value="">Provincia</option>
            {(provinciaList || []).map((p, i) => (
              // Codes are not guaranteed unique across macros (e.g. '04' is in
              // both DO34 and DO38), so include the index in the key.
              <option key={`${p.code}-${i}`} value={p.code}>{p.name}</option>
            ))}
          </select>
          <select
            value={filters.codigoMunicipio || ''}
            onChange={(e) => update('codigoMunicipio', e.target.value)}
            className="input-dark"
            disabled={!filters.codigoProvincia && !(municipioList?.length)}
          >
            <option value="">Municipio</option>
            {(municipioList || []).map((m, i) => (
              <option key={`${m.code}-${i}`} value={m.code}>{m.name}</option>
            ))}
          </select>
        </>
      )}

      {filters.showType !== false && filters.types && (
        <select
          value={filters.type || ''}
          onChange={(e) => update('type', e.target.value)}
          className="input-dark"
        >
          <option value="">Todos los tipos</option>
          {filters.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}

      {filters.showSeverity !== false && filters.severities && (
        <select
          value={filters.severidad || ''}
          onChange={(e) => update('severidad', e.target.value)}
          className="input-dark"
        >
          <option value="">Severidad</option>
          {filters.severities.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {filters.showDateRange !== false && (
        <>
          <input
            type="date"
            value={filters.fechaMin || ''}
            onChange={(e) => update('fechaMin', e.target.value)}
            className="input-dark"
          />
          <input
            type="date"
            value={filters.fechaMax || ''}
            onChange={(e) => update('fechaMax', e.target.value)}
            className="input-dark"
          />
        </>
      )}

      <button
        onClick={() => setFilters({})}
        className="ml-auto rounded-md border border-white/10 bg-surface-300/70 px-3 py-1.5 text-xs font-medium text-ink-200 hover:bg-neon-500/20 hover:border-neon-400 hover:text-neon-200 hover:shadow-glow-soft transition"
      >
        ✕ Limpiar
      </button>
    </div>
  );
}