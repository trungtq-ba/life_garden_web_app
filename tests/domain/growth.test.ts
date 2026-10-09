import {
  bloomDensity, creatureCounts, GARDEN_ITEMS, getItem, growthOf, isUnlocked, nextUnlock, stageOf,
} from '../../src/domain/growth';

const item = (id: string) => getItem(id)!;

describe('catalog', () => {
  it('has unique ids and sane numbers', () => {
    expect(new Set(GARDEN_ITEMS.map((i) => i.id)).size).toBe(GARDEN_ITEMS.length);
    for (const i of GARDEN_ITEMS) {
      expect(i.unlockAt).toBeGreaterThanOrEqual(0);
      expect(i.growSpan).toBeGreaterThanOrEqual(0);
      expect(i.slots.length).toBeGreaterThan(0);
      for (const s of i.slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(1000);
        expect(s.y).toBeGreaterThanOrEqual(330); // dưới đường chân trời
        expect(s.y).toBeLessThanOrEqual(600);
      }
    }
  });
  it('never has two slots closer than 30 units (no stacking)', () => {
    const all = GARDEN_ITEMS.flatMap((i) => i.slots.map((s) => ({ ...s, id: i.id })));
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        if (all[a].id === all[b].id && all[a].id !== 'grass') continue; // cụm cùng loại được sát nhau
        expect(Math.hypot(all[a].x - all[b].x, all[a].y - all[b].y)).toBeGreaterThanOrEqual(30);
      }
    }
  });
  it('always shows something at 0 points (grass is free)', () => {
    expect(GARDEN_ITEMS.filter((i) => isUnlocked(i, 0)).map((i) => i.id)).toContain('grass');
  });
});

describe('growthOf / isUnlocked', () => {
  it('hides locked items and starts growth at 0 on unlock', () => {
    expect(isUnlocked(item('daisy'), 9)).toBe(false);
    expect(growthOf(item('daisy'), 9)).toBe(0);
    expect(isUnlocked(item('daisy'), 10)).toBe(true);
    expect(growthOf(item('daisy'), 10)).toBe(0);
  });
  it('grows linearly over growSpan and clamps at 1', () => {
    const daisy = item('daisy'); // unlockAt 10, growSpan 15
    expect(growthOf(daisy, 17.5)).toBeCloseTo(0.5);
    expect(growthOf(daisy, 25)).toBe(1);
    expect(growthOf(daisy, 100000)).toBe(1);
  });
  it('shows decor fully grown the moment it unlocks', () => {
    expect(isUnlocked(item('bench'), 44)).toBe(false);
    expect(isUnlocked(item('bench'), 45)).toBe(true);
    expect(growthOf(item('bench'), 45)).toBe(1);
  });
  it('is monotonic in peak points', () => {
    for (const i of GARDEN_ITEMS) {
      let prev = 0;
      for (let p = 0; p <= 300; p += 5) {
        const g = growthOf(i, p);
        expect(g).toBeGreaterThanOrEqual(prev);
        prev = g;
      }
    }
  });
});

describe('stageOf', () => {
  it.each([[0, 'seed'], [0.24, 'seed'], [0.25, 'sprout'], [0.59, 'sprout'], [0.6, 'growing'], [0.99, 'growing'], [1, 'mature']])(
    'growth %s is %s',
    (g, s) => expect(stageOf(g as number)).toBe(s),
  );
});

describe('creatures and blooms', () => {
  it('counts butterflies from 25 points, capped at 4', () => {
    expect(creatureCounts(24).butterflies).toBe(0);
    expect(creatureCounts(25).butterflies).toBe(1);
    expect(creatureCounts(65).butterflies).toBe(2);
    expect(creatureCounts(100000).butterflies).toBe(4);
  });
  it('counts birds from 70 points, capped at 3', () => {
    expect(creatureCounts(69).birds).toBe(0);
    expect(creatureCounts(70).birds).toBe(1);
    expect(creatureCounts(130).birds).toBe(2);
    expect(creatureCounts(100000).birds).toBe(3);
  });
  it('adds fish and fireflies from 100 points', () => {
    expect(creatureCounts(99)).toMatchObject({ fish: 0, fireflies: 0 });
    expect(creatureCounts(100)).toMatchObject({ fish: 3, fireflies: 6 });
  });
  it('raises bloom density every 50 points after 190, capped at 6', () => {
    expect(bloomDensity(189)).toBe(0);
    expect(bloomDensity(190)).toBe(0);
    expect(bloomDensity(240)).toBe(1);
    expect(bloomDensity(490)).toBe(6);
    expect(bloomDensity(100000)).toBe(6);
  });
});

describe('nextUnlock', () => {
  it('returns the closest locked item and the points remaining', () => {
    const n = nextUnlock(0)!;
    expect(n.item.unlockAt).toBe(10);
    expect(n.remaining).toBe(10);
    expect(nextUnlock(12)!.item.unlockAt).toBe(25);
  });
  it('is null once everything is unlocked', () => {
    expect(nextUnlock(190)).toBeNull();
  });
});
