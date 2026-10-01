/* global jest, beforeEach, afterEach, test, expect, require, process */

// The main window loads ELECTRON_RENDERER_URL only in development; a packaged
// app always loads the bundled renderer from app://renderer/.

const mockElectron = {
  app: {
    enableSandbox: jest.fn(),
    isPackaged: false,
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  BrowserWindow: jest.fn(() => ({ loadURL: jest.fn() })),
  ipcMain: { handle: jest.fn() },
  Menu: { buildFromTemplate: jest.fn(), setApplicationMenu: jest.fn() },
  net: { fetch: jest.fn() },
  protocol: { registerSchemesAsPrivileged: jest.fn(), handle: jest.fn() },
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

const BUNDLED = 'app://renderer/index.html';

// The URL the main window loads once the app is ready.
const loaded = async () => {
  jest.isolateModules(() => {
    require('./main');
  });
  await mockElectron.app.whenReady.mock.results[0].value;
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

test('development loads the dev server from ELECTRON_RENDERER_URL', async () => {
  mockElectron.app.isPackaged = false;

  expect(await loaded()).toBe(DEV_SERVER);
});

test('a packaged app ignores ELECTRON_RENDERER_URL and loads the bundled renderer', async () => {
  mockElectron.app.isPackaged = true;

  expect(await loaded()).toBe(BUNDLED);
});

test('development without ELECTRON_RENDERER_URL loads the bundled renderer', async () => {
  mockElectron.app.isPackaged = false;
  delete process.env.ELECTRON_RENDERER_URL;

  expect(await loaded()).toBe(BUNDLED);
});
