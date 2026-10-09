import { fireEvent, render, screen } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { parallaxVector } from '../../src/ui/garden/parallax';

const rect = { left: 0, top: 0, width: 200, height: 100 };
const make = (effects: 'full' | 'calm') =>
  sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects });

describe('parallaxVector', () => {
  it('is 0 at the centre and ±1 at the corners', () => {
    expect(parallaxVector(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(parallaxVector(200, 100, rect)).toEqual({ x: 1, y: 1 });
    expect(parallaxVector(0, 0, rect)).toEqual({ x: -1, y: -1 });
  });
  it('clamps pointers outside the box and tolerates an empty box', () => {
    expect(parallaxVector(900, -900, rect)).toEqual({ x: 1, y: -1 });
    expect(parallaxVector(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('GardenScene parallax', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      ...rect, right: 200, bottom: 100, x: 0, y: 0, toJSON() {},
    } as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it('follows the mouse in full mode and recentres when it leaves', () => {
    render(<GardenScene state={make('full')} name="v" />);
    const scene = screen.getByTestId('garden-scene');
    fireEvent.mouseMove(scene, { clientX: 200, clientY: 0 });
    expect(scene.dataset.px).toBe('1');
    expect(scene.dataset.py).toBe('-1');
    fireEvent.mouseLeave(scene);
    expect(scene.dataset.px).toBe('0');
    expect(scene.dataset.py).toBe('0');
  });
  // Review Focus 4
  it('ignores the mouse entirely in calm mode', () => {
    render(<GardenScene state={make('calm')} name="v" />);
    const scene = screen.getByTestId('garden-scene');
    fireEvent.mouseMove(scene, { clientX: 200, clientY: 0 });
    expect(scene.dataset.px).toBeUndefined();
  });
});
