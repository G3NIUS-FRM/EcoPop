import TerritoryCard, { formatNumber, formatCurrency } from './TerritoryCard.jsx';

function KPI({ label, value, hint, accent = 'neon', large = false }) {
  const accents = {
    neon: 'neon-text',
    plasma: 'neon-text-plasma',
    violet: 'neon-text-violet',
  };
  return (
    <div className="kpi-tile group">
      <div className="text-[9px] uppercase tracking-[0.18em] text-ink-500 font-mono">{label}</div>
      <div
        className={`font-bold font-mono leading-tight mt-1 ${accents[accent]} ${
          large ? 'text-2xl md:text-[28px]' : 'text-lg'
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[9px] text-ink-500 mt-1 font-mono">{hint}</div>}
    </div>
  );
}

export default function KPISection({ territoryName, kpis }) {
  return (
    <TerritoryCard
      title="Indicadores Clave"
      subtitle={territoryName || 'Promedio nacional'}
      accent="violet"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <KPI
          label="Clientes"
          value={formatNumber(kpis.totalClientes)}
          hint="en territorio"
          accent="neon"
          large
        />
        <KPI
          label="Paga Prom."
          value={kpis.ingresoPromedio ? formatCurrency(kpis.ingresoPromedio) : '—'}
          hint="cliente / mes"
          accent="plasma"
          large
        />
        <KPI
          label="Gasto Prom."
          value={kpis.gastoPromedio ? formatCurrency(kpis.gastoPromedio) : '—'}
          hint="cliente / mes"
          accent="neon"
          large
        />
        <KPI
          label="Edad Prom."
          value={kpis.edadPromedio ? `${Math.round(kpis.edadPromedio)} años` : '—'}
          accent="violet"
        />
        <KPI
          label="Vocación +"
          value={kpis.vocacionPredominante || '—'}
          accent="plasma"
        />
        <KPI
          label="Pob. Territorio"
          value={formatNumber(kpis.pobTotal)}
          accent="violet"
        />
      </div>
    </TerritoryCard>
  );
}