import type { CSSProperties } from 'react';
import { hashSeed, rng } from '../../../domain/suggest';
import type { SceneState } from '../../../domain/scene';

const BLADES = (() => {
  const r = rng(hashSeed('blades'));
  return Array.from({ length: 14 }, (_, i) => ({ x: (i + r() * 0.8) * 72, h: 34 + r() * 30, w: 7 + r() * 5, d: r() * 4 }));
})();

const BLOOMS = (() => {
  const r = rng(hashSeed('bloom'));
  const hues = [330, 45, 280, 200, 12, 160];
  return Array.from({ length: 24 }, (_, i) => ({ x: r() * 1000, y: 565 + r() * 30, hue: hues[i % hues.length], d: r() * 4 }));
})();

export function ForegroundLayer({ state }: { state: SceneState }) {
  return (
    <g className="layer layer-foreground" data-depth="1.4">
      {BLADES.map((b, i) => (
        <path
          key={i}
          className="fg-blade sway"
          d={`M${b.x} 606 Q${b.x + b.w * 0.3} ${606 - b.h * 0.6} ${b.x + b.w} ${606 - b.h} Q${b.x + b.w * 0.9} ${606 - b.h * 0.4} ${b.x + b.w * 1.4} 606Z`}
          fill={i % 2 ? 'url(#leaf-dark)' : 'url(#leaf)'}
          style={{ '--delay': `${-b.d}s`, '--amp': '2.2deg', transformOrigin: `${b.x}px 606px` } as CSSProperties}
        />
      ))}
      {BLOOMS.slice(0, state.bloom * 4).map((f, i) => (
        <g key={i} className="fg-bloom" transform={`translate(${f.x} ${f.y})`}>
          <path d="M0 0 L0 -16" stroke="#2f8a4f" strokeWidth="2" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-22" rx="3.4" ry="6" fill={`hsl(${f.hue} 85% 68%)`} transform={`rotate(${a} 0 -16)`} />
          ))}
          <circle cx="0" cy="-16" r="2.6" fill="#ffe680" />
        </g>
      ))}
    </g>
  );
}
