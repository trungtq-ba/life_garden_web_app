import type { CSSProperties } from 'react';

const DROPS = [
  { x: 380, d: 0 }, { x: 470, d: 0.08 }, { x: 560, d: 0.16 }, { x: 650, d: 0.05 }, { x: 740, d: 0.12 },
];

export function WaterBurst({ tick }: { tick: number }) {
  return (
    <g key={tick} className="water-burst" aria-hidden="true">
      {DROPS.map((d, i) => (
        <g key={i} transform={`translate(${d.x} 300)`}>
          <g className="drop" style={{ '--delay': `${d.d}s`, '--dx': `${(i - 2) * 14}px` } as CSSProperties}>
            <path d="M0 -9 Q6 0 0 7 Q-6 0 0 -9Z" fill="#9fdcff" opacity="0.9" />
          </g>
        </g>
      ))}
    </g>
  );
}
