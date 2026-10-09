import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import Welcome from '../../src/ui/Welcome';

beforeEach(() => useStore.setState({ data: emptyData(), storageStatus: 'empty' }));

describe('Welcome', () => {
  it('shows the medical disclaimer', () => {
    render(<Welcome />);
    expect(screen.getByText(/không thay thế tư vấn y tế/i)).toBeInTheDocument();
  });

  it('skipping creates a default profile with no personal data', async () => {
    render(<Welcome />);
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(useStore.getState().data.profile).toEqual(DEFAULT_PROFILE);
  });

  it('saves entered profile and chosen habits', async () => {
    render(<Welcome />);
    await userEvent.type(screen.getByLabelText('Cân nặng (kg)'), '65');
    await userEvent.selectOptions(screen.getByLabelText('Mục tiêu'), 'sleep');
    await userEvent.click(screen.getByLabelText('Đi bộ')); // bỏ chọn
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    const { profile, settings } = useStore.getState().data;
    expect(profile).toMatchObject({ weightKg: 65, goal: 'sleep' });
    expect(settings.habits).not.toContain('walk');
  });
});
