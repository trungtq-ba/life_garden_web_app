import { act, render, renderHook, screen } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import css from '../../src/ui/garden/garden.css?raw';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { useSceneClock } from '../../src/ui/garden/useSceneClock';

const make = () =>
  sceneState({ peakPoints: 100, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full' });

function keyframeBlocks(source: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') depth -= 1;
      i += 1;
    }
    out.push({ name: m[1], body: source.slice(re.lastIndex, i - 1) });
  }
  return out;
}

describe('CSS motion rules', () => {
  it('has at least the core ambient keyframes', () => {
    const names = keyframeBlocks(css).map((b) => b.name);
    for (const n of ['sway', 'drift', 'flutter', 'flap', 'fly', 'circle', 'glow', 'rain', 'mist-drift', 'spin', 'breathe']) {
      expect(names).toContain(n);
    }
  });
  it('animates only transform and opacity inside keyframes', () => {
    for (const { name, body } of keyframeBlocks(css)) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]);
      const bad = props.filter((p) => !['transform', 'opacity'].includes(p));
      expect({ name, bad }).toEqual({ name, bad: [] });
    }
  });
  // Review Focus 4
  it('switches all animation off in calm mode and under prefers-reduced-motion', () => {
    expect(css).toMatch(/\.calm\s+\*[^{]*\{[^}]*animation:\s*none/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
  it('keeps birds at a resting position when animation is off', () => {
    expect(css).toMatch(/\.bird\s*\{[^}]*transform:\s*translateX\(var\(--x0/);
  });
  it('does not animate decoration that is hidden', () => {
    expect(css).toMatch(/\.weather-clear\s+\.cloud-extra\s*\{[^}]*animation:\s*none/);
  });
  it('pauses everything when the scene is paused', () => {
    expect(css).toMatch(/\[data-paused='true'\]\s+\*[^{]*\{[^}]*animation-play-state:\s*paused/);
  });
});

describe('useSceneClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Review Focus 3
  it('ticks with the wall clock so the sky can change while the app stays open', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 16, 59, 30));
    const { result } = renderHook(() => useSceneClock(60_000));
    expect(result.current.getHours()).toBe(16);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.getHours()).toBe(17);
  });
  it('refreshes immediately when the tab becomes visible again', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 10, 0, 0));
    const { result } = renderHook(() => useSceneClock(60_000));
    vi.setSystemTime(new Date(2026, 9, 9, 19, 5, 0));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.getHours()).toBe(19);
  });
});

describe('ambient pause', () => {
  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.unstubAllGlobals();
  });

  it('is running by default', () => {
    render(<GardenScene state={make()} name="v" />);
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'false');
  });
  it('pauses while the tab is hidden and resumes when it returns', () => {
    render(<GardenScene state={make()} name="v" />);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'true');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'false');
  });
  it('pauses while scrolled out of view', () => {
    let notify: (entries: { isIntersecting: boolean }[]) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) { notify = cb; }
      observe() {}
      disconnect() {}
    });
    render(<GardenScene state={make()} name="v" />);
    act(() => notify([{ isIntersecting: false }]));
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'true');
    act(() => notify([{ isIntersecting: true }]));
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'false');
  });
});
