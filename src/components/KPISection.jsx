import TerritoryCard, { formatNumber, formatCurrency } from './TerritoryCard.jsx';

function KPI({ label, value, hint, accent = 'neon' }) {
  const accents = {
    neon: 'neon-text',
    plasma: 'neon-text-plasma',
    violet: 'neon-text-violet',
  };
  return (
    <div className="kpi-tile group">
      <div className="text-[9px] uppercase tracking-[0.18em] text-ink-600">{label}</div>
      <div className={`text-base font-bold font-mono leading-tight mt-0.5 ${accents[accent]}`}>{value}</div>
      {hint && <div className="text-[9px] text-ink-500 mt-0.5 font-mono">{hint}</div>}
    </div>
  );
}

export default function KPISection({ territoryName, kpis }) {
  return (
    <TerritoryCard title="Indicadores Clave" subtitle={territoryName || 'Promedio nacional'} accent="blue">
      <div className="grid grid-cols-2 gap-2">
        <KPI
          label="Clientes"
          value={formatNumber(kpis.totalClientes)}
          hint="en territorio"
          accent="neon"
        />
        <KPI
          label="Paga Prom."
          value={kpis.ingresoPromedio ? formatCurrency(kpis.ingresoPromedio) : '—'}
          hint="cliente / mes"
          accent="plasma"
        />
        <KPI
          label="Gasto Prom."
          value={kpis.gastoPromedio ? formatCurrency(kpis.gastoPromedio) : '—'}
          hint="cliente / mes"
          accent="neon"
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