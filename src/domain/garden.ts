import type { Garden } from './types';

export const LEVEL_THRESHOLDS = [0, 10, 25, 45, 70, 100, 140, 190];

export function levelForPoints(p: number): number {
  let level = 0;
  LEVEL_THRESHOLDS.forEach((th, i) => {
    if (p >= th) level = i;
  });
  return level;
}

export function pointsToLevel(level: number): number | null {
  return level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
}

export function gridSize(level: number): number {
  return Math.min(8, 6 + Math.floor(level / 3));
}

export interface GardenItem {
  id: string;
  name: string;
  kind: 'plant' | 'decor';
  level: number;
  maxCount: number | null;
  art: string; // markup SVG bên trong viewBox 0 0 48 48
}

const STEM = '<rect x="23" y="22" width="2" height="18" fill="#388e3c"/>';

export const ITEMS: GardenItem[] = [
  { id: 'grass', name: 'Cỏ xanh', kind: 'plant', level: 0, maxCount: null,
    art: '<path d="M14 40 L18 22 L22 40 M24 40 L24 16 L28 40 M30 40 L36 24 L38 40" fill="#4caf50"/>' },
  { id: 'daisy', name: 'Hoa cúc', kind: 'plant', level: 1, maxCount: null,
    art: `${STEM}<circle cx="24" cy="18" r="6" fill="#fff" stroke="#bdbdbd"/><circle cx="24" cy="18" r="3" fill="#fbc02d"/>` },
  { id: 'stone', name: 'Hòn đá', kind: 'decor', level: 1, maxCount: null,
    art: '<ellipse cx="24" cy="34" rx="10" ry="6" fill="#9e9e9e"/>' },
  { id: 'tulip', name: 'Hoa tulip', kind: 'plant', level: 2, maxCount: null,
    art: `${STEM}<path d="M17 12 Q24 30 31 12 L27 16 L24 10 L21 16 Z" fill="#e91e63"/>` },
  { id: 'sunflower', name: 'Hướng dương', kind: 'plant', level: 3, maxCount: null,
    art: `${STEM}<circle cx="24" cy="16" r="8" fill="#fdd835"/><circle cx="24" cy="16" r="4" fill="#6d4c41"/>` },
  { id: 'bench', name: 'Ghế đá', kind: 'decor', level: 3, maxCount: 2,
    art: '<rect x="10" y="26" width="28" height="5" fill="#8d6e63"/><rect x="12" y="31" width="3" height="8" fill="#5d4037"/><rect x="33" y="31" width="3" height="8" fill="#5d4037"/>' },
  { id: 'apple-tree', name: 'Cây táo', kind: 'plant', level: 4, maxCount: 4,
    art: '<rect x="21" y="26" width="6" height="14" fill="#6d4c41"/><circle cx="24" cy="18" r="12" fill="#43a047"/><circle cx="19" cy="16" r="2" fill="#e53935"/><circle cx="29" cy="20" r="2" fill="#e53935"/>' },
  { id: 'lantern', name: 'Đèn lồng', kind: 'decor', level: 4, maxCount: null,
    art: '<rect x="23" y="12" width="2" height="26" fill="#616161"/><rect x="19" y="8" width="10" height="10" rx="2" fill="#ffca28"/>' },
  { id: 'pond', name: 'Hồ nước', kind: 'decor', level: 5, maxCount: 1,
    art: '<ellipse cx="24" cy="30" rx="18" ry="10" fill="#4fc3f7"/><ellipse cx="24" cy="30" rx="12" ry="6" fill="#81d4fa"/>' },
  { id: 'cherry-tree', name: 'Cây anh đào', kind: 'plant', level: 6, maxCount: 2,
    art: '<rect x="21" y="26" width="6" height="14" fill="#6d4c41"/><circle cx="24" cy="18" r="12" fill="#f48fb1"/>' },
  { id: 'bridge', name: 'Cây cầu nhỏ', kind: 'decor', level: 7, maxCount: 1,
    art: '<path d="M6 32 Q24 12 42 32" stroke="#8d6e63" stroke-width="5" fill="none"/>' },
];

export function getItem(id: string): GardenItem | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function growthStage(item: GardenItem, unlockedLevel: number): 0 | 1 | 2 {
  if (item.kind === 'decor') return 2;
  return Math.max(0, Math.min(2, unlockedLevel - item.level)) as 0 | 1 | 2;
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

export function canPlace(g: Garden, itemId: string, cell: number): PlaceCheck {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: 'Món này không tồn tại.' };
  if (item.level > g.unlockedLevel) return { ok: false, reason: 'Món này chưa được mở khóa.' };
  const size = gridSize(g.unlockedLevel);
  if (!Number.isInteger(cell) || cell < 0 || cell >= size * size) return { ok: false, reason: 'Ô này không nằm trong khu vườn.' };
  if (g.placed.some((p) => p.cell === cell)) return { ok: false, reason: 'Ô này đã có món khác.' };
  if (item.maxCount !== null && g.placed.filter((p) => p.itemId === itemId).length >= item.maxCount) {
    return { ok: false, reason: `Chỉ đặt được tối đa ${item.maxCount} ${item.name}.` };
  }
  return { ok: true };
}

export function placeItem(g: Garden, itemId: string, cell: number): Garden {
  if (!canPlace(g, itemId, cell).ok) return g;
  return { ...g, placed: [...g.placed, { cell, itemId }] };
}

export function removeAt(g: Garden, cell: number): Garden {
  return { ...g, placed: g.placed.filter((p) => p.cell !== cell) };
}

export function moveItem(g: Garden, from: number, to: number): Garden {
  const found = g.placed.find((p) => p.cell === from);
  if (!found) return g;
  const size = gridSize(g.unlockedLevel);
  if (!Number.isInteger(to) || to < 0 || to >= size * size || g.placed.some((p) => p.cell === to)) return g;
  return { ...g, placed: g.placed.map((p) => (p.cell === from ? { ...p, cell: to } : p)) };
}
