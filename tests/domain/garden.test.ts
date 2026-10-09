import { canPlace, getItem, gridSize, growthStage, ITEMS, moveItem, placeItem, removeAt } from '../../src/domain/garden';
import type { Garden } from '../../src/domain/types';

const g = (unlockedLevel: number, placed: Garden['placed'] = []): Garden => ({ name: 'v', unlockedLevel, placed });

describe('garden grid', () => {
  it('starts at 6x6 and grows slowly up to 8x8', () => {
    expect(gridSize(0)).toBe(6);
    expect(gridSize(2)).toBe(6);
    expect(gridSize(3)).toBe(7);
    expect(gridSize(6)).toBe(8);
    expect(gridSize(99)).toBe(8);
  });
});

describe('placement rules', () => {
  // Review Focus 5
  it('rejects unknown item, locked item, out-of-grid cell and occupied cell', () => {
    expect(canPlace(g(0), 'nope', 0)).toMatchObject({ ok: false });
    expect(canPlace(g(0), 'daisy', 0)).toMatchObject({ ok: false }); // daisy level 1
    expect(canPlace(g(1), 'daisy', 36)).toMatchObject({ ok: false }); // 6x6 => 0..35
    expect(canPlace(g(1), 'daisy', -1)).toMatchObject({ ok: false });
    expect(canPlace(g(1), 'daisy', 1.5)).toMatchObject({ ok: false });
    expect(canPlace(g(1, [{ cell: 0, itemId: 'grass' }]), 'daisy', 0)).toMatchObject({ ok: false });
  });
  it('enforces maxCount', () => {
    const placed = [{ cell: 0, itemId: 'pond' }];
    expect(canPlace(g(5, placed), 'pond', 1)).toMatchObject({ ok: false });
    expect(canPlace(g(5, placed), 'grass', 1)).toEqual({ ok: true });
  });
  it('places, removes and moves without mutating the input', () => {
    const start = g(1);
    const placed = placeItem(start, 'daisy', 3);
    expect(start.placed).toHaveLength(0);
    expect(placed.placed).toEqual([{ cell: 3, itemId: 'daisy' }]);
    expect(moveItem(placed, 3, 5).placed).toEqual([{ cell: 5, itemId: 'daisy' }]);
    expect(moveItem(placed, 3, 99)).toBe(placed);
    expect(removeAt(placed, 3).placed).toEqual([]);
  });
  it('returns the same garden object for an invalid placement', () => {
    const start = g(0);
    expect(placeItem(start, 'daisy', 0)).toBe(start);
  });
});

describe('growth stages', () => {
  it('grows plants with level and keeps decor fully grown', () => {
    const daisy = getItem('daisy')!; // level 1
    expect(growthStage(daisy, 1)).toBe(0);
    expect(growthStage(daisy, 2)).toBe(1);
    expect(growthStage(daisy, 5)).toBe(2);
    expect(growthStage(getItem('bench')!, 3)).toBe(2);
  });
  it('has unique item ids', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });
});
