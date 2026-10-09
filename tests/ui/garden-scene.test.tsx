import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sceneState } from '../../src/domain/scene';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { Preview } from '../../src/ui/garden/Preview';

const make = (over: Partial<Parameters<typeof sceneState>[0]> = {}) =>
  sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });

describe('GardenScene base', () => {
  it('is an image with a descriptive label and hides its internals', () => {
    const { container } = render(<GardenScene state={make()} name="Vườn Mai" />);
    const scene = screen.getByTestId('garden-scene');
    expect(scene).toHaveAttribute('role', 'img');
    expect(scene.getAttribute('aria-label')).toContain('Vườn Mai');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  it('marks the current sky phase and only that sky as active', () => {
    const { container } = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 18) })} name="v" />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('phase-dusk');
    const active = [...container.querySelectorAll('.sky')].filter((n) => n.getAttribute('data-active') === 'true');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveClass('sky-dusk');
  });
  it('shows the sun by day and the moon by night', () => {
    const day = render(<GardenScene state={make()} name="v" />);
    expect(day.container.querySelector('.sun')).not.toBeNull();
    expect(day.container.querySelector('.moon')).toBeNull();
    day.unmount();
    const night = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 23) })} name="v" />);
    expect(night.container.querySelector('.moon')).not.toBeNull();
    expect(night.container.querySelector('.sun')).toBeNull();
  });
  it('flags calm mode', () => {
    render(<GardenScene state={make({ effects: 'calm' })} name="v" />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
  });
  it('always draws hills and ground, even with zero points', () => {
    const { container } = render(<GardenScene state={make()} name="v" />);
    expect(container.querySelector('.layer-far-hills')).not.toBeNull();
    expect(container.querySelector('.layer-near-hills')).not.toBeNull();
    expect(container.querySelector('.layer-ground')).not.toBeNull();
  });
});

describe('Preview harness', () => {
  it('updates the scene when the controls change', async () => {
    render(<Preview />);
    const hour = screen.getByLabelText('Giờ');
    await userEvent.clear(hour);
    await userEvent.type(hour, '23');
    expect(screen.getByTestId('garden-scene')).toHaveClass('phase-night');
    await userEvent.selectOptions(screen.getByLabelText('Hiệu ứng'), 'calm');
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
  });
});
