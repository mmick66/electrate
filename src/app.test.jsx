import { render, screen } from '@testing-library/react';
import App from './app';

test('App renders the welcome screen', () => {
  const { container } = render(<App />);

  expect(container.firstChild).toHaveProperty('className', 'hello');

  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
    'Hello Electrate',
  );
  expect(screen.getByAltText('Electrate logo').getAttribute('src')).toBe(
    './assets/logo.png',
  );
  expect(
    screen.getAllByRole('heading', { level: 4 }).map((h4) => h4.textContent),
  ).toEqual(['A basic Electron + React.js template', 'Have Fun!']);
});
