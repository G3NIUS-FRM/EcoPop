import { useMemo } from 'react';

const ACCENT_CLASSES = {
  slate: 'border-white/8',
  blue: 'border-neon-400/40',
  amber: 'border-warn-400/40',
  red: 'border-danger-400/40',
  violet: 'border-violet-400/40',
  plasma: 'border-plasma-400/40',
};

const ACCENT_TITLES = {
  slate: 'neon-text',
  blue: 'neon-text',
  amber: 'text-warn-300',
  red: 'text-danger-300',
  violet: 'neon-text-violet',
  plasma: 'neon-text-plasma',
};

export default function TerritoryCard({ title, subtitle, children, footer, accent = 'slate', className = '' }) {
  const borderClass = ACCENT_CLASSES[accent] || ACCENT_CLASSES.slate;
  const titleClass = ACCENT_TITLES[accent] || ACCENT_TITLES.slate;
  return (
    <div className={`glass rounded-xl overflow-hidden border ${borderClass} ${className}`}>
      <div className="relative border-b border-white/5 px-4 py-2.5 bg-surface-300/55">
        <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${titleClass}`}>{title}</div>
        {subtitle && (
          <div className="text-[11px] text-ink-300 mt-0.5 font-mono">{subtitle}</div>
        )}
      </div>
      <div className="px-4 py-3 text-sm text-ink-100">{children}</div>
      {footer && (
        <div className="border-t border-white/5 px-4 py-2 text-[10px] uppercase tracking-wider text-ink-400 font-mono bg-surface-300/40">
          {footer}
        </div>
      )}
    </div>
  );
}

export function formatNumber(n, digits = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-DO', { maximumFractionDigits: digits });
}

export function formatCurrency(n) {
  if (n === null || n === undefined) return '—';
  return `DOP ${formatNumber(n)}`;
}

export function formatPercent(part, total) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}