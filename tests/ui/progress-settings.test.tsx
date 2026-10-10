import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE, type DayTask } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import ProgressScreen from '../../src/ui/ProgressScreen';
import SettingsScreen from '../../src/ui/SettingsScreen';

const t = (id: string, status: DayTask['status']): DayTask => ({
  id, templateId: id, habit: 'walk', title: id, minutes: 5, points: 3, status,
});

describe('ProgressScreen', () => {
  it('shows the weekly summary and reached milestones', () => {
    useStore.setState({
      data: { ...emptyData(), profile: DEFAULT_PROFILE, days: { '2026-10-05': [t('a', 'done'), t('b', 'pending')] } },
      storageStatus: 'ok',
    });
    render(<ProgressScreen date="2026-10-09" />);
    expect(screen.getByText('Tuần này: 1/2 nhiệm vụ · 3 điểm')).toBeInTheDocument();
    expect(screen.getByText('Nhiệm vụ đầu tiên')).toBeInTheDocument();
  });

  it('is gentle and empty-safe with no history', () => {
    useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' });
    render(<ProgressScreen date="2026-10-09" />);
    expect(screen.getByText('Tuần này: 0/0 nhiệm vụ · 0 điểm')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có lịch sử/)).toBeInTheDocument();
  });
});

describe('SettingsScreen', () => {
  beforeEach(() =>
    useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' }));

  it('shows the medical disclaimer', () => {
    render(<SettingsScreen />);
    expect(screen.getByText(/không thay thế tư vấn y tế/i)).toBeInTheDocument();
  });

  it('saves profile, habits and reminder time', async () => {
    render(<SettingsScreen />);
    await userEvent.type(screen.getByLabelText('Cân nặng (kg)'), '70');
    const time = screen.getByLabelText('Giờ nhắc nhở');
    await userEvent.clear(time);
    await userEvent.type(time, '07:30');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    const { profile, settings } = useStore.getState().data;
    expect(profile?.weightKg).toBe(70);
    expect(settings.reminderTime).toBe('07:30');
  });

  it('saves a tidy full name and clears it when emptied', async () => {
    render(<SettingsScreen />);
    await userEvent.type(screen.getByLabelText('Họ và tên'), '  Nguyễn   Thị Lan ');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(useStore.getState().data.profile?.fullName).toBe('Nguyễn Thị Lan');
    await userEvent.clear(screen.getByLabelText('Họ và tên'));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(useStore.getState().data.profile?.fullName).toBeUndefined();
  });

  it('toggles notifications even if permission is unsupported (in-app reminders still work)', async () => {
    render(<SettingsScreen />);
    await userEvent.click(screen.getByLabelText('Bật thông báo nhắc nhở'));
    expect(useStore.getState().data.settings.notificationsEnabled).toBe(true);
  });

  it('requires a second confirmation before wiping data', async () => {
    useStore.setState((s) => ({ data: { ...s.data, garden: { ...s.data.garden, name: 'Giữ lại' } } }));
    render(<SettingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Xóa toàn bộ dữ liệu' }));
    expect(useStore.getState().data.garden.name).toBe('Giữ lại');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    expect(useStore.getState().data.profile).toBeNull();
  });

  // Review Focus 4
  it('shows an error and keeps data when an invalid file is imported', async () => {
    render(<SettingsScreen />);
    const file = new File(['{"nonsense":true}'], 'bad.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Nhập dữ liệu'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp không hợp lệ');
    expect(useStore.getState().data.profile).not.toBeNull();
  });

  it('refreshes the form after a successful import so saving cannot revert it', async () => {
    useStore.setState((st) => ({ data: { ...st.data, profile: { ...DEFAULT_PROFILE, weightKg: 50 } } }));
    render(<SettingsScreen />);
    expect(screen.getByLabelText('Cân nặng (kg)')).toHaveValue(50);
    const backup = JSON.stringify({ ...emptyData(), profile: { ...DEFAULT_PROFILE, weightKg: 90 } });
    await userEvent.upload(screen.getByLabelText('Nhập dữ liệu'), new File([backup], 'ok.json', { type: 'application/json' }));
    expect(await screen.findByText('Đã nhập dữ liệu.')).toBeInTheDocument();
    expect(screen.getByLabelText('Cân nặng (kg)')).toHaveValue(90);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(useStore.getState().data.profile?.weightKg).toBe(90);
  });
});
