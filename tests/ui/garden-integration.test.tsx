import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dateKey } from '../../src/domain/date';
import { DEFAULT_PROFILE, type DayTask } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import GardenScreen from '../../src/ui/GardenScreen';
import SettingsScreen from '../../src/ui/SettingsScreen';
import Today from '../../src/ui/Today';

const D = dateKey(new Date()); // cảnh đọc đồng hồ thật nên dùng ngày thật
const mk = (id: string, title: string, points = 2): DayTask => ({
  id, templateId: id, habit: 'walk', title, minutes: 5, points, status: 'pending',
});

const seed = (tasks: DayTask[], peakPoints = 0, gardenEffects: 'full' | 'calm' | null = null) =>
  useStore.setState({
    data: {
      ...emptyData(),
      profile: DEFAULT_PROFILE,
      days: { [D]: tasks },
      garden: { name: 'Vườn Mai', peakPoints },
      settings: { ...emptyData().settings, gardenEffects },
    },
    storageStatus: 'ok',
    wateredTick: 0,
  });

afterEach(() => vi.unstubAllGlobals());

const stubReducedMotion = () =>
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
  }));

describe('Today hero', () => {
  it('shows the live garden above the tasks', () => {
    seed([mk('a', 'Đi bộ')]);
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByTestId('garden-scene').getAttribute('aria-label')).toContain('Vườn Mai');
  });
  it('opens the garden tab when the scene is clicked', async () => {
    const open = vi.fn();
    seed([mk('a', 'Đi bộ')]);
    render(<Today date={D} onOpenGarden={open} />);
    await userEvent.click(screen.getByTestId('garden-scene'));
    expect(open).toHaveBeenCalled();
  });
  it('waters the garden right away when a task is completed', async () => {
    seed([mk('a', 'Đi bộ'), mk('b', 'Giãn cơ')]);
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('.water-burst')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    expect(container.querySelectorAll('.water-burst .drop')).toHaveLength(5);
  });
  it('does not replay the watering when the scene is mounted again later', () => {
    seed([mk('a', 'Đi bộ')]);
    useStore.setState({ wateredTick: 3 });
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('.water-burst')).toBeNull();
    expect(container.querySelector('.layer-elements')!.getAttribute('class')).not.toMatch(/pulse-/);
  });
  it('still waters on a completion after mounting with an old tick', async () => {
    seed([mk('a', 'Đi bộ')]);
    useStore.setState({ wateredTick: 3 });
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    expect(container.querySelectorAll('.water-burst .drop')).toHaveLength(5);
  });
  it('raises a rainbow when every task is done', async () => {
    seed([mk('a', 'Đi bộ'), mk('b', 'Giãn cơ')]);
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Giãn cơ' }));
    expect(container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'true');
  });
  it('celebrates a freshly unlocked item', async () => {
    seed([mk('big', 'Việc lớn', 10)]);
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('[data-item="daisy"]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Việc lớn' }));
    expect(container.querySelector('[data-item="daisy"] .unlock-pop')).not.toBeNull();
  });
  // Review Focus 4
  it('forces calm mode when the system asks for reduced motion, even if the setting says full', async () => {
    stubReducedMotion();
    seed([mk('a', 'Đi bộ')], 0, 'full');
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    expect(container.querySelector('.water-burst')).toBeNull();
  });
  it('honours an explicit calm setting', () => {
    seed([mk('a', 'Đi bộ')], 0, 'calm');
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
  });
});

describe('Garden tab', () => {
  it('shows the large scene, the name field and the collection', () => {
    seed([], 50);
    render(<GardenScreen />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('large');
    expect(screen.getByDisplayValue('Vườn Mai')).toBeInTheDocument();
    expect(screen.getByText('Hoa cúc · đã trưởng thành')).toBeInTheDocument();
  });
});

describe('Settings: garden effects', () => {
  it('defaults to full and lets the user pick the light mode', async () => {
    seed([]);
    render(<SettingsScreen />);
    expect(screen.getByLabelText('Đầy đủ')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Nhẹ'));
    expect(useStore.getState().data.settings.gardenEffects).toBe('calm');
    expect(screen.getByLabelText('Nhẹ')).toBeChecked();
  });
  it('locks the choice to light when the system prefers reduced motion', () => {
    stubReducedMotion();
    seed([], 0, 'full');
    render(<SettingsScreen />);
    expect(screen.getByLabelText('Nhẹ')).toBeChecked();
    expect(screen.getByLabelText('Nhẹ')).toBeDisabled();
    expect(screen.getByLabelText('Đầy đủ')).toBeDisabled();
    expect(screen.getByText(/giảm chuyển động/)).toBeInTheDocument();
  });
});
