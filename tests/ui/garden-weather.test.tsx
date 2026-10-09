import { render } from '@testing-library/react';
import { sceneState, type Weather } from '../../src/domain/scene';
import { GardenScene } from '../../src/ui/garden/GardenScene';

const make = (over: Partial<Parameters<typeof sceneState>[0]> = {}, weather?: Weather) => {
  const s = sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });
  return weather ? { ...s, weather } : s;
};
const q = (c: HTMLElement, sel: string) => c.querySelectorAll(sel).length;

describe('WeatherLayer', () => {
  it('draws exactly 28 raindrops in the rain, and none otherwise', () => {
    expect(q(render(<GardenScene state={make({}, 'rain')} name="v" />).container, '.raindrop')).toBe(28);
    expect(q(render(<GardenScene state={make({}, 'clear')} name="v" />).container, '.raindrop')).toBe(0);
  });
  // Review Focus 4
  it('draws no rain in calm mode even on a rainy day', () => {
    expect(q(render(<GardenScene state={make({ effects: 'calm' }, 'rain')} name="v" />).container, '.raindrop')).toBe(0);
  });
  it('draws three mist banks on misty mornings, also in calm mode', () => {
    const full = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 6) }, 'mist')} name="v" />);
    expect(q(full.container, '.mist')).toBe(3);
    full.unmount();
    const calm = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 6), effects: 'calm' }, 'mist')} name="v" />);
    expect(q(calm.container, '.mist')).toBe(3);
  });
});

describe('LightLayer', () => {
  it('shows sun rays by day unless it rains, never at night', () => {
    expect(q(render(<GardenScene state={make({}, 'clear')} name="v" />).container, '.ray')).toBe(7);
    expect(q(render(<GardenScene state={make({}, 'rain')} name="v" />).container, '.ray')).toBe(0);
    expect(q(render(<GardenScene state={make({ now: new Date(2026, 9, 9, 23) }, 'clear')} name="v" />).container, '.ray')).toBe(0);
  });
  it('keeps the rainbow element but only marks it visible when every task is done', () => {
    const hidden = render(<GardenScene state={make({ todayRatio: 0.5 })} name="v" />);
    expect(hidden.container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'false');
    hidden.unmount();
    const shown = render(<GardenScene state={make({ todayRatio: 1 })} name="v" />);
    expect(shown.container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'true');
    expect(q(shown.container, '.rainbow .arc')).toBe(7);
  });
  it('puts a halo on each lantern only once lanterns exist', () => {
    expect(q(render(<GardenScene state={make({ peakPoints: 69 })} name="v" />).container, '.lantern-halo')).toBe(0);
    expect(q(render(<GardenScene state={make({ peakPoints: 70 })} name="v" />).container, '.lantern-halo')).toBe(1);
  });
  it('renders fireflies in the light layer, above the night tint', () => {
    const { container } = render(<GardenScene state={make({ peakPoints: 100, now: new Date(2026, 9, 9, 22) })} name="v" />);
    expect(q(container, '.layer-light .firefly')).toBe(6);
    expect(q(container, '.layer-creatures .firefly')).toBe(0);
  });
});

describe('ForegroundLayer', () => {
  it('always has grass blades and adds 4 flowers per bloom level', () => {
    expect(q(render(<GardenScene state={make()} name="v" />).container, '.fg-blade')).toBe(14);
    expect(q(render(<GardenScene state={make()} name="v" />).container, '.fg-bloom')).toBe(0);
    expect(q(render(<GardenScene state={make({ peakPoints: 340 })} name="v" />).container, '.fg-bloom')).toBe(12);
    expect(q(render(<GardenScene state={make({ peakPoints: 5000 })} name="v" />).container, '.fg-bloom')).toBe(24);
  });
});
