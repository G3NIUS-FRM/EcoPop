import { useMemo } from 'react';

const ACCENT_CLASSES = {
  slate: 'border-neon-500/15',
  blue: 'border-neon-400/35',
  amber: 'border-warn-400/35',
  red: 'border-danger-400/35',
  violet: 'border-violet-400/35',
  plasma: 'border-plasma-400/35',
};

const ACCENT_TITLES = {
  slate: 'neon-text',
  blue: 'neon-text',
  amber: 'text-warn-400',
  red: 'text-danger-400',
  violet: 'neon-text-violet',
  plasma: 'neon-text-plasma',
};

export default function TerritoryCard({ title, subtitle, children, footer, accent = 'slate' }) {
  const borderClass = ACCENT_CLASSES[accent] || ACCENT_CLASSES.slate;
  const titleClass = ACCENT_TITLES[accent] || ACCENT_TITLES.slate;
  return (
    <div className={`glass rounded-xl overflow-hidden`}>
      <div className={`relative border-b border-neon-500/15 px-4 py-2.5 bg-white/40`}>
        <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${titleClass}`}>{title}</div>
        {subtitle && (
          <div className="text-[11px] text-ink-700 mt-0.5 font-mono">{subtitle}</div>
        )}
      </div>
      <div className="px-4 py-3 text-sm text-ink-900">{children}</div>
      {footer && (
        <div className="border-t border-neon-500/15 px-4 py-2 text-[10px] uppercase tracking-wider text-ink-600 font-mono">
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