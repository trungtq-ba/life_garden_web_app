import { render } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import { GARDEN_ITEMS } from '../../src/domain/growth';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { depthScale } from '../../src/ui/garden/layers/ElementsLayer';

const make = (peak: number, over: Partial<Parameters<typeof sceneState>[0]> = {}) =>
  sceneState({ peakPoints: peak, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });
const count = (c: HTMLElement, id: string) => c.querySelectorAll(`[data-item="${id}"]`).length;

describe('depthScale', () => {
  it('grows from 0.7 at the horizon to 1.3 at the front and is clamped', () => {
    expect(depthScale(330)).toBeCloseTo(0.7);
    expect(depthScale(600)).toBeCloseTo(1.3);
    expect(depthScale(100)).toBeCloseTo(0.7);
    expect(depthScale(900)).toBeCloseTo(1.3);
    expect(depthScale(465)).toBeGreaterThan(depthScale(400));
  });
});

describe('ElementsLayer', () => {
  // Review Focus 5
  it('is never empty at 0 points (grass and a seedling exist)', () => {
    const { container } = render(<GardenScene state={make(0)} name="v" />);
    expect(count(container, 'grass')).toBe(4);
    expect(count(container, 'daisy')).toBe(0);
  });
  it('adds items as points grow', () => {
    const { container } = render(<GardenScene state={make(45)} name="v" />);
    expect(count(container, 'daisy')).toBe(3);
    expect(count(container, 'bench')).toBe(1);
    expect(count(container, 'sunflower')).toBe(2);
    expect(count(container, 'apple-tree')).toBe(0);
  });
  it('shows every item with its slots past the last unlock', () => {
    const { container } = render(<GardenScene state={make(600)} name="v" />);
    for (const item of GARDEN_ITEMS) expect(count(container, item.id)).toBe(item.slots.length);
  });
  it('draws instances back to front (non-decreasing y)', () => {
    const { container } = render(<GardenScene state={make(600)} name="v" />);
    const ys = [...container.querySelectorAll('[data-item]')].map((n) => Number(n.getAttribute('data-y')));
    expect(ys.length).toBeGreaterThan(10);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
  it('records each instance growth so tests and styles can read it', () => {
    const { container } = render(<GardenScene state={make(80)} name="v" />);
    const apple = container.querySelector('[data-item="apple-tree"]')!;
    expect(Number(apple.getAttribute('data-growth'))).toBeCloseTo(0.25);
  });
});

describe('CreaturesLayer', () => {
  it('adds butterflies and birds by day, more with today progress', () => {
    const none = render(<GardenScene state={make(10)} name="v" />);
    expect(none.container.querySelectorAll('.butterfly')).toHaveLength(0);
    none.unmount();
    const mid = render(<GardenScene state={make(100)} name="v" />);
    expect(mid.container.querySelectorAll('.butterfly')).toHaveLength(2);
    expect(mid.container.querySelectorAll('.bird')).toHaveLength(1);
    expect(mid.container.querySelectorAll('.firefly')).toHaveLength(0);
    mid.unmount();
    const happy = render(<GardenScene state={make(100, { todayRatio: 0.5 })} name="v" />);
    expect(happy.container.querySelectorAll('.butterfly')).toHaveLength(4);
  });
  it('swaps butterflies and birds for fireflies at night', () => {
    const { container } = render(<GardenScene state={make(100, { now: new Date(2026, 9, 9, 22) })} name="v" />);
    expect(container.querySelectorAll('.butterfly')).toHaveLength(0);
    expect(container.querySelectorAll('.bird')).toHaveLength(0);
    expect(container.querySelectorAll('.firefly')).toHaveLength(6);
  });
  it('lets the wildlife rest on a rainy day', () => {
    const { container } = render(<GardenScene state={make(100, { dateKey: '2026-10-09' })} name="v" />);
    expect(container.querySelectorAll('.butterfly')).toHaveLength(0);
    expect(container.querySelectorAll('.bird')).toHaveLength(0);
  });
  it('keeps fish inside the pond only once it exists', () => {
    const early = render(<GardenScene state={make(99)} name="v" />);
    expect(early.container.querySelectorAll('.fish')).toHaveLength(0);
    early.unmount();
    const later = render(<GardenScene state={make(100)} name="v" />);
    expect(later.container.querySelectorAll('.fish')).toHaveLength(3);
  });
});
