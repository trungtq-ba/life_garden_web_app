import { getItem } from '../../../domain/growth';
import type { SceneState } from '../../../domain/scene';
import { Firefly } from '../items/Creatures';
import { depthScale } from './ElementsLayer';

const RAYS = [-62, -42, -22, -4, 14, 34, 54];

export function LightLayer({ state }: { state: SceneState }) {
  const { body, t } = state.sky;
  const sx = 90 + 820 * t;
  const sy = 300 - 210 * Math.sin(Math.PI * t);
  const showRays = body === 'sun' && state.weather !== 'rain';
  const lanterns = state.items.some((i) => i.id === 'lantern') ? getItem('lantern')!.slots : [];

  return (
    <g className="layer layer-light" data-depth="1.2">
      <rect className="warm" x="-40" y="-40" width="1080" height="680" fill="#ffd9a0" />
      {showRays && (
        <g transform={`translate(${sx} ${sy})`}>
          <g className="sun-rays">
            {RAYS.map((a) => (
              <polygon key={a} className="ray" points="0,0 -16,-340 16,-340" fill="url(#ray)" transform={`rotate(${a})`} />
            ))}
          </g>
        </g>
      )}
      {lanterns.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y - 76 * depthScale(s.y)})`}>
          <circle className="lantern-halo" r={52 * depthScale(s.y)} fill="url(#sun-glow)" />
        </g>
      ))}
      {Array.from({ length: state.creatures.fireflies }, (_, i) => <Firefly key={i} index={i} />)}
    </g>
  );
}
