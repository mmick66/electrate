/* global jest, beforeEach, afterEach, test, expect, require, process */

// The main window loads ELECTRON_RENDERER_URL only in development; a packaged
// app always loads the bundled renderer.

const mockElectron = {
  app: {
    isPackaged: false,
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  BrowserWindow: jest.fn(() => ({ loadURL: jest.fn(), loadFile: jest.fn() })),
  session: {
    defaultSession: {
      setPermissionRequestHandler: jest.fn(),
      setPermissionCheckHandler: jest.fn(),
    },
  },
  shell: { openExternal: jest.fn() },
};

jest.mock('electron', () => mockElectron);

const DEV_SERVER = 'http://localhost:5173';

// What the main window loads once the app is ready: a URL, or a file path.
const loaded = async () => {
  jest.isolateModules(() => {
    require('./main');
  });
  await mockElectron.app.whenReady.mock.results[0].value;
  const window = mockElectron.BrowserWindow.mock.results[0].value;
  if (window.loadURL.mock.calls.length > 0) {
    return { url: window.loadURL.mock.calls[0][0] };
  }
  return { file: window.loadFile.mock.calls[0][0] };
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ELECTRON_RENDERER_URL = DEV_SERVER;
});

afterEach(() => {
  delete process.env.ELECTRON_RENDERER_URL;
});

test('development loads the dev server from ELECTRON_RENDERER_URL', async () => {
  mockElectron.app.isPackaged = false;

  expect(await loaded()).toEqual({ url: DEV_SERVER });
});

test('a packaged app ignores ELECTRON_RENDERER_URL and loads the bundled renderer', async () => {
  mockElectron.app.isPackaged = true;

  const { file } = await loaded();
  expect(file).toMatch(/renderer[\\/]index\.html$/);
});

test('development without ELECTRON_RENDERER_URL loads the bundled renderer', async () => {
  mockElectron.app.isPackaged = false;
  delete process.env.ELECTRON_RENDERER_URL;

  const { file } = await loaded();
  expect(file).toMatch(/renderer[\\/]index\.html$/);
});
