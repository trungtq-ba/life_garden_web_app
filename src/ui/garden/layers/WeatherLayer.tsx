import type { CSSProperties } from 'react';
import { hashSeed, rng } from '../../../domain/suggest';
import type { SceneState } from '../../../domain/scene';

const DROPS = (() => {
  const r = rng(hashSeed('rain'));
  return Array.from({ length: 28 }, () => ({ x: r() * 1060 - 30, delay: r() * 1.2, dur: 0.9 + r() * 0.5 }));
})();

const MIST = [
  { x: 200, y: 430, rx: 340, ry: 46, delay: 0 },
  { x: 620, y: 470, rx: 380, ry: 52, delay: 7 },
  { x: 880, y: 410, rx: 300, ry: 40, delay: 13 },
];

export function WeatherLayer({ state }: { state: SceneState }) {
  const raining = state.weather === 'rain' && !state.calm;
  return (
    <g className="layer layer-weather" data-depth="1.15">
      {state.weather === 'mist' &&
        MIST.map((m, i) => (
          <g key={i} className="mist" style={{ '--delay': `${-m.delay}s` } as CSSProperties}>
            <ellipse cx={m.x} cy={m.y} rx={m.rx} ry={m.ry} fill="url(#mist)" />
          </g>
        ))}
      {raining &&
        DROPS.map((d, i) => (
          <line
            key={i}
            className="raindrop"
            x1={d.x} y1="0" x2={d.x - 5} y2="18"
            stroke="#d6e9ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"
            style={{ '--delay': `${-d.delay}s`, '--dur': `${d.dur}s` } as CSSProperties}
          />
        ))}
    </g>
  );
}
