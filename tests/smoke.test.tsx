import { render, screen } from '@testing-library/react';
import App from '../src/App';

it('renders the app title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Life Garden' })).toBeInTheDocument();
});
