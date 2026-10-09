export interface Slot {
  x: number;
  y: number;
}
export interface GardenItem {
  id: string;
  name: string;
  kind: 'plant' | 'decor';
  unlockAt: number;
  growSpan: number; // 0 = xuất hiện nguyên vẹn
  slots: Slot[]; // toạ độ trong viewBox 1000x600; tinh chỉnh bằng mắt khi dựng cảnh
}

export const GARDEN_ITEMS: GardenItem[] = [
  { id: 'grass', name: 'Cỏ xanh', kind: 'plant', unlockAt: 0, growSpan: 10,
    slots: [{ x: 170, y: 540 }, { x: 300, y: 565 }, { x: 640, y: 570 }, { x: 840, y: 525 }] },
  { id: 'daisy', name: 'Hoa cúc', kind: 'plant', unlockAt: 10, growSpan: 15,
    slots: [{ x: 190, y: 470 }, { x: 245, y: 485 }, { x: 215, y: 515 }] },
  { id: 'stone', name: 'Hòn đá', kind: 'decor', unlockAt: 10, growSpan: 0,
    slots: [{ x: 345, y: 520 }] },
  { id: 'tulip', name: 'Hoa tulip', kind: 'plant', unlockAt: 25, growSpan: 20,
    slots: [{ x: 430, y: 500 }, { x: 475, y: 515 }, { x: 450, y: 535 }] },
  { id: 'sunflower', name: 'Hướng dương', kind: 'plant', unlockAt: 45, growSpan: 25,
    slots: [{ x: 700, y: 480 }, { x: 745, y: 495 }] },
  { id: 'bench', name: 'Ghế đá', kind: 'decor', unlockAt: 45, growSpan: 0,
    slots: [{ x: 835, y: 455 }] },
  { id: 'apple-tree', name: 'Cây táo', kind: 'plant', unlockAt: 70, growSpan: 40,
    slots: [{ x: 290, y: 410 }] },
  { id: 'lantern', name: 'Đèn lồng', kind: 'decor', unlockAt: 70, growSpan: 0,
    slots: [{ x: 780, y: 425 }] },
  { id: 'pond', name: 'Hồ nước', kind: 'decor', unlockAt: 100, growSpan: 20,
    slots: [{ x: 600, y: 535 }] },
  { id: 'cherry-tree', name: 'Cây anh đào', kind: 'plant', unlockAt: 140, growSpan: 40,
    slots: [{ x: 690, y: 405 }] },
  { id: 'bridge', name: 'Cây cầu nhỏ', kind: 'decor', unlockAt: 190, growSpan: 0,
    slots: [{ x: 600, y: 500 }] },
];

export const getItem = (id: string): GardenItem | undefined => GARDEN_ITEMS.find((i) => i.id === id);

export const isUnlocked = (item: GardenItem, peak: number): boolean => peak >= item.unlockAt;

export function growthOf(item: GardenItem, peak: number): number {
  if (!isUnlocked(item, peak)) return 0;
  if (item.growSpan === 0) return 1;
  return Math.max(0, Math.min(1, (peak - item.unlockAt) / item.growSpan));
}

export type Stage = 'seed' | 'sprout' | 'growing' | 'mature';

export function stageOf(growth: number): Stage {
  if (growth >= 1) return 'mature';
  if (growth >= 0.6) return 'growing';
  if (growth >= 0.25) return 'sprout';
  return 'seed';
}

export function creatureCounts(peak: number) {
  return {
    butterflies: peak < 25 ? 0 : Math.min(4, 1 + Math.floor((peak - 25) / 40)),
    birds: peak < 70 ? 0 : Math.min(3, 1 + Math.floor((peak - 70) / 60)),
    fish: peak < 100 ? 0 : 3,
    fireflies: peak < 100 ? 0 : 6,
  };
}

export function bloomDensity(peak: number): number {
  return peak < 190 ? 0 : Math.min(6, Math.floor((peak - 190) / 50));
}

export function nextUnlock(peak: number): { item: GardenItem; remaining: number } | null {
  const locked = GARDEN_ITEMS.filter((i) => !isUnlocked(i, peak)).sort((a, b) => a.unlockAt - b.unlockAt);
  return locked.length === 0 ? null : { item: locked[0], remaining: locked[0].unlockAt - peak };
}
