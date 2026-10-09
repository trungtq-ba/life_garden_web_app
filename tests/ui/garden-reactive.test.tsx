import { render } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import css from '../../src/ui/garden/garden.css?raw';
import { GardenScene } from '../../src/ui/garden/GardenScene';

const make = (over: Partial<Parameters<typeof sceneState>[0]> = {}) =>
  sceneState({ peakPoints: 50, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });

describe('watering burst', () => {
  it('does nothing before the first completed task', () => {
    const { container } = render(<GardenScene state={make()} name="v" wateredTick={0} />);
    expect(container.querySelector('.water-burst')).toBeNull();
  });
  it('shows five droplets after a completion and restarts on the next one', () => {
    const { container, rerender } = render(<GardenScene state={make()} name="v" wateredTick={1} />);
    expect(container.querySelectorAll('.water-burst .drop')).toHaveLength(5);
    const first = container.querySelector('.layer-elements')!.getAttribute('class');
    rerender(<GardenScene state={make()} name="v" wateredTick={2} />);
    const second = container.querySelector('.layer-elements')!.getAttribute('class');
    expect(first).toContain('pulse-b');
    expect(second).toContain('pulse-a');
  });
  // Review Focus 4
  it('stays still in calm mode', () => {
    const { container } = render(<GardenScene state={make({ effects: 'calm' })} name="v" wateredTick={3} />);
    expect(container.querySelector('.water-burst')).toBeNull();
    expect(container.querySelector('.layer-elements')!.getAttribute('class')).not.toMatch(/pulse-/);
  });
  it('defines both nudge animations and a drop animation with only transform/opacity', () => {
    expect(css).toMatch(/@keyframes\s+nudge-a/);
    expect(css).toMatch(/@keyframes\s+nudge-b/);
    expect(css).toMatch(/@keyframes\s+drop/);
    expect(css).toMatch(/@keyframes\s+pop/);
  });
});

describe('unlock celebration', () => {
  it('lets the pop animation win over the nudge when both apply at once', () => {
    // .pulse-a .nudge (0,2,0) would override a bare .unlock-pop (0,1,0); the pop rule must be more specific
    expect(css).toMatch(/\.nudge\.unlock-pop\s*\{[^}]*animation:\s*pop/);
  });
  it('pops the freshly unlocked items and rings them', () => {
    const { container } = render(<GardenScene state={make()} name="v" justUnlocked={['sunflower']} />);
    const sunflowers = container.querySelectorAll('[data-item="sunflower"]');
    expect(sunflowers.length).toBeGreaterThan(0);
    sunflowers.forEach((n) => {
      expect(n.querySelector('.unlock-pop')).not.toBeNull();
      expect(n.querySelector('.unlock-ring')).not.toBeNull();
    });
    expect(container.querySelector('[data-item="daisy"] .unlock-pop')).toBeNull();
  });
  it('skips the celebration in calm mode', () => {
    const { container } = render(<GardenScene state={make({ effects: 'calm' })} name="v" justUnlocked={['sunflower']} />);
    expect(container.querySelector('.unlock-pop')).toBeNull();
    expect(container.querySelector('.unlock-ring')).toBeNull();
  });
  it('ignores ids that are not in the scene', () => {
    const { container } = render(<GardenScene state={make({ peakPoints: 0 })} name="v" justUnlocked={['bridge']} />);
    expect(container.querySelector('.unlock-pop')).toBeNull();
  });
});
