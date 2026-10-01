import { render, screen, fireEvent } from '@testing-library/react';
import App from './app';

test('App counts button clicks', () => {
  render(<App />);

  const button = screen.getByRole('button');
  expect(button.textContent).toBe('Count: 0');

  fireEvent.click(button);
  expect(button.textContent).toBe('Count: 1');
});
