import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import GardenScreen from '../../src/ui/GardenScreen';

const seed = (peakPoints: number, name = 'Vườn thử') =>
  useStore.setState({
    data: { ...emptyData(), profile: DEFAULT_PROFILE, garden: { name, peakPoints } },
    storageStatus: 'ok',
  });

describe('GardenScreen', () => {
  it('shows the garden name and the collection list', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getByDisplayValue('Vườn thử')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trong vườn của bạn' })).toBeInTheDocument();
    expect(screen.getByText('Cỏ xanh · mới gieo (0%)')).toBeInTheDocument();
  });

  it('shows locked items as silhouettes with the points still needed', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getByText('Hoa cúc · còn 10 điểm')).toBeInTheDocument();
    expect(screen.getByText('Cây cầu nhỏ · còn 190 điểm')).toBeInTheDocument();
  });

  it('shows growth stages for unlocked items', () => {
    seed(50);
    render(<GardenScreen />);
    expect(screen.getByText('Hoa cúc · đã trưởng thành')).toBeInTheDocument();
    expect(screen.getByText('Hướng dương · mới gieo (20%)')).toBeInTheDocument();
  });

  it('renames the garden on blur', async () => {
    seed(0);
    render(<GardenScreen />);
    const input = screen.getByLabelText('Tên khu vườn');
    await userEvent.clear(input);
    await userEvent.type(input, 'Vườn Mai');
    await userEvent.tab();
    expect(useStore.getState().data.garden.name).toBe('Vườn Mai');
  });

  it('restores the old name when the field is left blank', async () => {
    seed(0);
    render(<GardenScreen />);
    const input = screen.getByLabelText('Tên khu vườn');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(useStore.getState().data.garden.name).toBe('Vườn thử');
    expect(input).toHaveValue('Vườn thử');
  });
});
