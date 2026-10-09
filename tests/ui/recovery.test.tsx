import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BACKUP_KEY, emptyData, STORAGE_KEY } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import Recovery from '../../src/ui/Recovery';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, '{bad');
  useStore.setState({ data: emptyData(), storageStatus: 'corrupt' });
});

describe('Recovery', () => {
  it('needs a second confirmation before starting over', async () => {
    render(<Recovery />);
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu lại' }));
    expect(useStore.getState().storageStatus).toBe('corrupt');
    expect(screen.getByRole('button', { name: 'Xác nhận bắt đầu lại' })).toBeInTheDocument();
  });

  it('keeps a backup copy of the unreadable data when starting over', async () => {
    render(<Recovery />);
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu lại' }));
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận bắt đầu lại' }));
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{bad');
    expect(useStore.getState().storageStatus).toBe('ok');
  });
});
