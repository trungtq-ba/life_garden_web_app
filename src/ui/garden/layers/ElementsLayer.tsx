import { getItem } from '../../../domain/growth';
import type { SceneState } from '../../../domain/scene';
import { Bird, Butterfly, Firefly } from '../items/Creatures';
import { ITEM_ART } from '../items';

export function depthScale(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 330) / 270));
  return 0.7 + 0.6 * t;
}

export function ElementsLayer({ state }: { state: SceneState }) {
  const instances = state.items
    .flatMap((si) => {
      const def = getItem(si.id);
      const art = ITEM_ART[si.id];
      if (!def || !art) return [];
      return def.slots.map((slot, i) => ({ key: `${si.id}-${i}`, id: si.id, slot, growth: si.growth, i, art }));
    })
    .sort((a, b) => a.slot.y - b.slot.y);

  return (
    <g className="layer layer-elements" data-depth="1">
      {instances.map(({ key, id, slot, growth, i, art }) => {
        const k = art.min + (1 - art.min) * growth;
        return (
          <g key={key} transform={`translate(${slot.x} ${slot.y})`} data-item={id} data-y={slot.y} data-growth={growth}>
            <g transform={`scale(${depthScale(slot.y)})`}>
              {art.shadow > 0 && <ellipse className="shadow" cx="0" cy="2" rx={art.shadow} ry={art.shadow * 0.28} fill="url(#shadow)" />}
              <g className="grow" style={{ transform: `scale(${k})` }}>
                <art.Art growth={growth} seed={i + slot.x} fish={id === 'pond' ? state.creatures.fish : 0} />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function CreaturesLayer({ state }: { state: SceneState }) {
  const butterflies = state.creatures.butterflies + state.extraButterflies;
  return (
    <g className="layer layer-creatures" data-depth="1.1">
      {Array.from({ length: state.creatures.birds }, (_, i) => <Bird key={`b${i}`} index={i} />)}
      {Array.from({ length: butterflies }, (_, i) => <Butterfly key={`f${i}`} index={i} hue={[330, 45, 200, 280][i % 4]} />)}
      {Array.from({ length: state.creatures.fireflies }, (_, i) => <Firefly key={`y${i}`} index={i} />)}
    </g>
  );
}
