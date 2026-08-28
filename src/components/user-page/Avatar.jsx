// Avatar — initials-only circular avatar used by user-page cards.
// Drawn as a real <svg> so it scales cleanly on mobile and prints well.
// Props:
//   initials : string (e.g. "AM")
//   color    : CSS color for the background
//   size     : px (default 40)
//   ring     : 'neon' | 'plasma' | 'violet' | null — adds a colored ring
//              to indicate the source-of-report kind. Null = no ring.

export default function Avatar({ initials = '?', color = '#5BBC9A', size = 40, ring = null }) {
  const ringColor = {
    neon: '#5BBC9A',
    plasma: '#A5CC3F',
    violet: '#4FB8A2',
  }[ring] || null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      style={{
        display: 'block',
        filter: ringColor ? `drop-shadow(0 0 6px ${ringColor}88)` : 'none',
      }}
    >
      {ringColor && <circle cx="20" cy="20" r="19" fill={ringColor} opacity="0.35" />}
      <circle
        cx="20"
        cy="20"
        r={ringColor ? 17 : 20}
        fill={color}
        stroke={ringColor || '#0F1622'}
        strokeWidth={ringColor ? 2 : 0}
      />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fontSize="14"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fill="#0F1622"
        letterSpacing="0.5"
      >
        {initials.slice(0, 2)}
      </text>
    </svg>
  );
}
