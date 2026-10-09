import type { CSSProperties } from 'react';

const V = (vars: Record<string, string>) => vars as unknown as CSSProperties;

const BUTTERFLY_PATHS = [
  { x: 250, y: 400, dx: [60, 120, 40], dy: [-40, 10, -30] },
  { x: 520, y: 450, dx: [-50, 40, -80], dy: [-30, -60, -20] },
  { x: 760, y: 380, dx: [40, -30, 70], dy: [-50, -10, -40] },
  { x: 390, y: 330, dx: [-60, 30, 80], dy: [-20, -50, -10] },
];
const BIRD_ROWS = [150, 110, 190];
const FIREFLIES = [
  { x: 220, y: 420 }, { x: 420, y: 470 }, { x: 640, y: 430 },
  { x: 820, y: 410 }, { x: 330, y: 380 }, { x: 740, y: 500 },
];

export function Butterfly({ index, hue }: { index: number; hue: number }) {
  const p = BUTTERFLY_PATHS[index % BUTTERFLY_PATHS.length];
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <g
        className="butterfly"
        style={V({
          '--x1': `${p.dx[0]}px`, '--y1': `${p.dy[0]}px`, '--x2': `${p.dx[1]}px`, '--y2': `${p.dy[1]}px`,
          '--x3': `${p.dx[2]}px`, '--y3': `${p.dy[2]}px`, '--delay': `${-index * 3.1}s`,
        })}
      >
        <g className="wings">
          <ellipse cx="-6" cy="-2" rx="7" ry="5" fill={`hsl(${hue} 85% 65%)`} />
          <ellipse cx="6" cy="-2" rx="7" ry="5" fill={`hsl(${hue} 85% 65%)`} />
          <ellipse cx="-4" cy="4" rx="4.5" ry="3.5" fill={`hsl(${hue} 75% 55%)`} />
          <ellipse cx="4" cy="4" rx="4.5" ry="3.5" fill={`hsl(${hue} 75% 55%)`} />
        </g>
        <rect x="-0.8" y="-6" width="1.6" height="12" rx="0.8" fill="#4b3a2f" />
      </g>
    </g>
  );
}

export function Bird({ index }: { index: number }) {
  return (
    <g transform={`translate(0 ${BIRD_ROWS[index % BIRD_ROWS.length]})`}>
      <g className="bird" style={V({ '--delay': `${-index * 11}s`, '--dur': `${32 + index * 6}s` })}>
        <path d="M-10 0 Q-5 -7 0 0 Q5 -7 10 0" stroke="#34495e" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

export function Firefly({ index }: { index: number }) {
  const f = FIREFLIES[index % FIREFLIES.length];
  return (
    <g transform={`translate(${f.x} ${f.y})`}>
      <g className="firefly" style={V({ '--delay': `${-index * 1.7}s` })}>
        <circle r="9" fill="url(#sun-glow)" />
        <circle r="2.2" fill="#fff6c8" />
      </g>
    </g>
  );
}
