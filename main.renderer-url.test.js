/* global jest, beforeEach, afterEach, test, expect, require, process */

// The main window loads ELECTRON_RENDERER_URL only in development; a packaged
// app always loads the bundled renderer.

const mockElectron = {
  app: { isPackaged: false, on: jest.fn() },
  BrowserWindow: jest.fn(() => ({ loadURL: jest.fn(), on: jest.fn() })),
  shell: { openExternal: jest.fn() },
};

jest.mock('electron', () => mockElectron);

const DEV_SERVER = 'http://localhost:5173';

const loadedURL = () => {
  jest.isolateModules(() => {
    require('./main');
  });
  const [, createWindow] = mockElectron.app.on.mock.calls.find(
    ([event]) => event === 'ready',
  );
  createWindow();
  const window = mockElectron.BrowserWindow.mock.results[0].value;
  return window.loadURL.mock.calls[0][0];
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ELECTRON_RENDERER_URL = DEV_SERVER;
});

afterEach(() => {
  delete process.env.ELECTRON_RENDERER_URL;
});

test('development loads the dev server from ELECTRON_RENDERER_URL', () => {
  mockElectron.app.isPackaged = false;

  expect(loadedURL()).toBe(DEV_SERVER);
});

test('a packaged app ignores ELECTRON_RENDERER_URL and loads the bundled renderer', () => {
  mockElectron.app.isPackaged = true;

  const loaded = loadedURL();
  expect(loaded).toMatch(/^file:\/\//);
  expect(loaded).toMatch(/renderer[\\/]index\.html$/);
});

test('development without ELECTRON_RENDERER_URL loads the bundled renderer', () => {
  mockElectron.app.isPackaged = false;
  delete process.env.ELECTRON_RENDERER_URL;

  expect(loadedURL()).toMatch(/^file:\/\/.*renderer[\\/]index\.html$/);
});
