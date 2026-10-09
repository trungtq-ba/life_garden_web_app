import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { DEFAULT_PROFILE } from '../src/domain/types';
import { emptyData, STORAGE_KEY } from '../src/state/storage';
import { useStore } from '../src/state/store';

describe('App routing', () => {
  it('shows Welcome when there is no profile', () => {
    useStore.setState({ data: emptyData(), storageStatus: 'empty' });
    render(<App />);
    expect(screen.getByRole('heading', { name: /Chào mừng/ })).toBeInTheDocument();
  });
  it('shows the tab bar once the profile exists', () => {
    useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' });
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
  });
  it('shows recovery for corrupt data', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    useStore.setState({ storageStatus: 'corrupt' });
    render(<App />);
    expect(screen.getByRole('heading', { name: /Không đọc được dữ liệu/ })).toBeInTheDocument();
  });
});
