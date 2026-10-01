/* global jest, beforeEach, afterEach, test, expect, require, process */

// The electrate:get-version IPC handler answers only the app's own page, and
// only when it is called with no arguments.

const mockElectron = {
  app: {
    enableSandbox: jest.fn(),
    getVersion: jest.fn(() => '1.2.3'),
    isPackaged: true,
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

// Loads main.js and returns the handler it registers for the channel once
// the app is ready.
const handler = async (channel) => {
  jest.isolateModules(() => {
    require('./main');
  });
  await mockElectron.app.whenReady.mock.results[0].value;
  const [, handle] = mockElectron.ipcMain.handle.mock.calls.find(
    ([name]) => name === channel,
  );
  return handle;
};

// An IPC event as Electron passes it to a handler, sent from a frame at url.
const from = (url) => ({ senderFrame: { url } });

beforeEach(() => {
  jest.clearAllMocks();
  mockElectron.app.isPackaged = true;
  delete process.env.ELECTRON_RENDERER_URL;
});

afterEach(() => {
  delete process.env.ELECTRON_RENDERER_URL;
});

test('the handler is registered before the window opens', async () => {
  await handler('electrate:get-version');

  expect(mockElectron.ipcMain.handle.mock.invocationCallOrder[0]).toBeLessThan(
    mockElectron.BrowserWindow.mock.invocationCallOrder[0],
  );
});

test('the app page gets the app version', async () => {
  const getVersion = await handler('electrate:get-version');

  expect(getVersion(from('app://renderer/index.html'))).toBe('1.2.3');
});

test('in development the dev server page gets the app version', async () => {
  mockElectron.app.isPackaged = false;
  process.env.ELECTRON_RENDERER_URL = DEV_SERVER;
  const getVersion = await handler('electrate:get-version');

  expect(getVersion(from(`${DEV_SERVER}/`))).toBe('1.2.3');
});

test.each([
  ['another site', 'https://example.com/'],
  ['another app:// host', 'app://other/index.html'],
  ['a file:// page', 'file:///etc/passwd'],
  ['the dev server in a packaged app', `${DEV_SERVER}/`],
  ['the dev server on another port', 'http://localhost:5174/'],
  ['a blank frame', 'about:blank'],
  ['a malformed URL', 'not a url'],
])('a call from %s is rejected', async (name, url) => {
  process.env.ELECTRON_RENDERER_URL = DEV_SERVER;
  const getVersion = await handler('electrate:get-version');

  expect(() => getVersion(from(url))).toThrow('sender is not the app');
  expect(mockElectron.app.getVersion).not.toHaveBeenCalled();
});

test('a call from a frame that has gone away is rejected', async () => {
  const getVersion = await handler('electrate:get-version');

  expect(() => getVersion({ senderFrame: null })).toThrow(
    'sender is not the app',
  );
});

test('a call with arguments is rejected', async () => {
  const getVersion = await handler('electrate:get-version');

  expect(() => getVersion(from('app://renderer/index.html'), 'x')).toThrow(
    'takes no arguments',
  );
  expect(mockElectron.app.getVersion).not.toHaveBeenCalled();
});
