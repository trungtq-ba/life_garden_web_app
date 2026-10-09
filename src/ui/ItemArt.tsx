import type { GardenItem } from '../domain/garden';

const SCALE = [0.5, 0.75, 1];

export function ItemArt({ item, stage, size = 40 }: { item: GardenItem; stage: 0 | 1 | 2; size?: number }) {
  const s = item.kind === 'plant' ? SCALE[stage] : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={item.name}>
      <g
        transform={`translate(24 40) scale(${s}) translate(-24 -40)`}
        dangerouslySetInnerHTML={{ __html: item.art }}
      />
    </svg>
  );
}
