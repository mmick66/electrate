import { render, screen } from '@testing-library/react';
import App from './app';

test('App shows the version the main process reports', async () => {
  window.electrate.getVersion.mockResolvedValueOnce('1.2.3');

  render(<App />);

  expect((await screen.findByText('Version 1.2.3')).className).toBe('version');
  expect(window.electrate.getVersion).toHaveBeenCalledWith();
});
