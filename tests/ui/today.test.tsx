import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE, type DayTask } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import Today from '../../src/ui/Today';

const D = '2026-10-09';
const mk = (id: string, title: string): DayTask => ({
  id, templateId: id, habit: 'walk', title, minutes: 5, points: 2, status: 'pending',
});

beforeEach(() => {
  useStore.setState({
    data: {
      ...emptyData(),
      profile: DEFAULT_PROFILE,
      days: { [D]: [mk('a', 'Đi bộ 10 phút'), mk('b', 'Giãn cơ 5 phút'), mk('c', 'Uống nước')] },
    },
    storageStatus: 'ok',
  });
});

describe('Today greeting', () => {
  afterEach(() => vi.useRealTimers());
  it('addresses the user by title and capitalised name', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 9, 8, 0) });
    useStore.setState((s) => ({ data: { ...s.data, profile: { ...DEFAULT_PROFILE, gender: 'female', fullName: 'Nguyễn Thị Lan' } } }));
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chào buổi sáng, chị NGUYỄN THỊ LAN');
  });
  it('keeps the plain greeting when no name is set', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 9, 12, 0) });
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Chào buổi trưa 🌿$/);
  });
});

describe('Today', () => {
  it('shows tasks and progress', () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByText('0/3 nhiệm vụ')).toBeInTheDocument();
    expect(screen.getByText('Giãn cơ 5 phút')).toBeInTheDocument();
  });

  it('completes and un-completes a task', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Hoàn thành: Đi bộ 10 phút' });
    await userEvent.click(btn);
    expect(screen.getByText('1/3 nhiệm vụ')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(screen.getByText('0/3 nhiệm vụ')).toBeInTheDocument();
  });

  it('skips a task without penalty wording', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua: Giãn cơ 5 phút' }));
    expect(useStore.getState().data.days[D][1].status).toBe('skipped');
    expect(screen.queryByText(/thất bại|bỏ lỡ|mất/i)).not.toBeInTheDocument();
  });

  it('adds a custom task', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.type(screen.getByLabelText('Tên nhiệm vụ riêng'), 'Dắt chó đi dạo');
    await userEvent.clear(screen.getByLabelText('Số phút'));
    await userEvent.type(screen.getByLabelText('Số phút'), '15');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Dắt chó đi dạo')).toBeInTheDocument();
  });

  it('opens the garden shortcut', async () => {
    const open = vi.fn();
    render(<Today date={D} onOpenGarden={open} />);
    await userEvent.click(screen.getByRole('button', { name: 'Xem khu vườn' }));
    expect(open).toHaveBeenCalled();
  });

  it('shows a gentle in-app reminder only when enabled, due and pending', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 21, 0, 0));
    useStore.setState((s) => ({ data: { ...s.data, settings: { ...s.data.settings, notificationsEnabled: true, reminderTime: '20:00' } } }));
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đến giờ chăm sóc khu vườn');
    vi.useRealTimers();
  });

  it('does not offer Đổi for a skipped task', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua: Giãn cơ 5 phút' }));
    expect(screen.queryByRole('button', { name: 'Đổi: Giãn cơ 5 phút' })).not.toBeInTheDocument();
  });

  it('tells the user when there is no other task to swap to', async () => {
    const water = ['water-1', 'water-2', 'water-3'].map((id, i) => ({
      ...mk(`w${i}`, `Nước ${i}`), templateId: id, habit: 'water' as const,
    }));
    useStore.setState((st) => ({ data: { ...st.data, days: { [D]: water } } }));
    render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Đổi: Nước 0' }));
    expect(screen.getByText('Chưa có nhiệm vụ khác cùng loại để đổi.')).toBeInTheDocument();
  });
});
