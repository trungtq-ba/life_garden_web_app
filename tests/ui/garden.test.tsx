import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import GardenScreen from '../../src/ui/GardenScreen';

const seed = (unlockedLevel: number, placed: { cell: number; itemId: string }[] = []) =>
  useStore.setState({
    data: { ...emptyData(), profile: DEFAULT_PROFILE, garden: { name: 'Vườn thử', unlockedLevel, placed } },
    storageStatus: 'ok',
  });

describe('GardenScreen', () => {
  it('renders a 6x6 grid at level 0 and shows the garden name', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getAllByRole('button', { name: /^Ô \d+/ })).toHaveLength(36);
    expect(screen.getByDisplayValue('Vườn thử')).toBeInTheDocument();
  });

  it('places an unlocked item in a selected empty cell', async () => {
    seed(1);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Ô 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Đặt Hoa cúc' }));
    expect(useStore.getState().data.garden.placed).toEqual([{ cell: 0, itemId: 'daisy' }]);
  });

  it('does not offer locked items', async () => {
    seed(0);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Ô 1' }));
    expect(screen.queryByRole('button', { name: 'Đặt Hoa cúc' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đặt Cỏ xanh' })).toBeInTheDocument();
  });

  it('disables an item that reached its max count', async () => {
    seed(5, [{ cell: 0, itemId: 'pond' }]);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Ô 2(:|$)/ }));
    expect(screen.getByRole('button', { name: 'Đặt Hồ nước' })).toBeDisabled();
  });

  it('removes and moves a placed item', async () => {
    seed(1, [{ cell: 0, itemId: 'daisy' }]);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Ô 1(:|$)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Di chuyển' }));
    await userEvent.click(screen.getByRole('button', { name: /^Ô 3(:|$)/ }));
    expect(useStore.getState().data.garden.placed).toEqual([{ cell: 2, itemId: 'daisy' }]);
    await userEvent.click(screen.getByRole('button', { name: /^Ô 3(:|$)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Gỡ' }));
    expect(useStore.getState().data.garden.placed).toHaveLength(0);
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

  it('hints at the next unlock', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getByText(/Sắp mở khóa: Hoa cúc \(còn 10 điểm\)/)).toBeInTheDocument();
  });
});
