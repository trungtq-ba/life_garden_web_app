import type { CSSProperties } from 'react';
import { hashSeed, rng } from '../../../domain/suggest';
import type { SceneState, SkyPhase } from '../../../domain/scene';

const PHASES: SkyPhase[] = ['dawn', 'day', 'dusk', 'night'];

const STARS = (() => {
  const r = rng(hashSeed('stars'));
  return Array.from({ length: 36 }, () => ({ x: r() * 1000, y: r() * 260, r: 0.8 + r() * 1.6, d: r() * 4 }));
})();

const CLOUDS = [
  { x: 120, y: 90, s: 1, d: 0, extra: false },
  { x: 480, y: 140, s: 0.8, d: 1, extra: false },
  { x: 800, y: 70, s: 1.15, d: 2, extra: false },
  { x: 300, y: 50, s: 0.7, d: 3, extra: true },
  { x: 650, y: 125, s: 0.9, d: 4, extra: true },
  { x: 40, y: 160, s: 0.75, d: 5, extra: true },
];

export function SkyLayer({ state }: { state: SceneState }) {
  const { body, t } = state.sky;
  const x = 90 + 820 * t;
  const y = 300 - 210 * Math.sin(Math.PI * t);
  return (
    <g className="layer layer-sky" data-depth="0.15">
      {PHASES.map((p) => (
        <rect key={p} className={`sky sky-${p}`} data-active={state.phase === p} x="-40" y="-40" width="1080" height="500" fill={`url(#sky-${p})`} />
      ))}
      <g className="stars">
        {STARS.map((s, i) => (
          <circle key={i} className="star" cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ '--delay': `${-s.d}s` } as CSSProperties} />
        ))}
      </g>
      {body === 'sun' ? (
        <g className="sun" transform={`translate(${x} ${y})`}>
          <circle r="120" fill="url(#sun-glow)" />
          <circle r="38" fill="url(#sun)" />
        </g>
      ) : (
        <g className="moon" transform={`translate(${x} ${y})`}>
          <circle r="90" fill="url(#moon-glow)" />
          <circle r="28" fill="url(#moon)" />
          <circle cx="-8" cy="-6" r="5" fill="#cfd6df" opacity="0.6" />
          <circle cx="9" cy="8" r="3.5" fill="#cfd6df" opacity="0.5" />
        </g>
      )}
    </g>
  );
}

function Cloud() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="60" ry="22" />
      <ellipse cx="-34" cy="6" rx="38" ry="18" />
      <ellipse cx="38" cy="8" rx="42" ry="17" />
      <ellipse cx="6" cy="-14" rx="34" ry="20" />
    </g>
  );
}

export function CloudsLayer() {
  return (
    <g className="layer layer-clouds" data-depth="0.3">
      {CLOUDS.map((c, i) => (
        <g key={i} className={`cloud-drift${c.extra ? ' cloud-extra' : ''}`} style={{ '--delay': `${-c.d * 17}s`, '--dur': `${90 + c.d * 9}s` } as CSSProperties}>
          <g className="cloud" transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <Cloud />
          </g>
        </g>
      ))}
    </g>
  );
}
