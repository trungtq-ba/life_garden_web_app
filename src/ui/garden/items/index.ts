import type { ComponentType } from 'react';
import { Bench, Bridge, Lantern, Pond, Stone } from './Decor';
import { AppleTree, CherryTree, Daisy, Grass, Sunflower, Tulip, type ArtProps } from './Plants';

export type { ArtProps };

export const ITEM_ART: Record<string, { Art: ComponentType<ArtProps>; shadow: number; min: number }> = {
  grass: { Art: Grass, shadow: 22, min: 0.35 },
  daisy: { Art: Daisy, shadow: 12, min: 0.3 },
  stone: { Art: Stone, shadow: 26, min: 1 },
  tulip: { Art: Tulip, shadow: 12, min: 0.3 },
  sunflower: { Art: Sunflower, shadow: 20, min: 0.3 },
  bench: { Art: Bench, shadow: 44, min: 1 },
  'apple-tree': { Art: AppleTree, shadow: 50, min: 0.25 },
  lantern: { Art: Lantern, shadow: 12, min: 1 },
  pond: { Art: Pond, shadow: 0, min: 1 },
  'cherry-tree': { Art: CherryTree, shadow: 48, min: 0.25 },
  bridge: { Art: Bridge, shadow: 0, min: 1 },
};
