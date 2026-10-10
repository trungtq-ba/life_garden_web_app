import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';

beforeEach(() => useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' }));

describe('tab bar', () => {
  it('marks exactly the open tab as current and moves the mark on click', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    const tab = (n: string) => within(nav).getByRole('button', { name: n });
    expect(tab('Hôm nay')).toHaveAttribute('aria-current', 'page');
    expect(tab('Tiến độ')).not.toHaveAttribute('aria-current');
    await userEvent.click(tab('Tiến độ'));
    expect(tab('Tiến độ')).toHaveAttribute('aria-current', 'page');
    expect(tab('Hôm nay')).not.toHaveAttribute('aria-current');
  });

  it('gives every tab a decorative icon so the label stays its only name', () => {
    render(<App />);
    const buttons = within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getAllByRole('button');
    expect(buttons).toHaveLength(4);
    for (const b of buttons) expect(b.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});
