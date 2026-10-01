/* global jest, beforeEach, test, expect, require */

// Every permission a page requests or checks (camera, microphone,
// notifications, ...) is denied, and the handlers are in place before the
// first window opens.

const order = [];

const mockElectron = {
  app: {
    enableSandbox: jest.fn(),
    isPackaged: true,
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  BrowserWindow: jest.fn(() => {
    order.push('window');
    return { loadURL: jest.fn() };
  }),
  ipcMain: { handle: jest.fn() },
  Menu: { buildFromTemplate: jest.fn(), setApplicationMenu: jest.fn() },
  net: { fetch: jest.fn() },
  protocol: { registerSchemesAsPrivileged: jest.fn(), handle: jest.fn() },
  session: {
    defaultSession: {
      setPermissionRequestHandler: jest.fn(() => order.push('request handler')),
      setPermissionCheckHandler: jest.fn(() => order.push('check handler')),
    },
  },
  shell: { openExternal: jest.fn() },
};

jest.mock('electron', () => mockElectron);

const { defaultSession } = mockElectron.session;

// Runs main.js until the app is ready and its first window is open.
const ready = async () => {
  jest.isolateModules(() => {
    require('./main');
  });
  await mockElectron.app.whenReady.mock.results[0].value;
};

beforeEach(() => {
  jest.clearAllMocks();
  order.length = 0;
});

test('permission handlers are set before the first window is created', async () => {
  await ready();

  expect(order).toEqual(['request handler', 'check handler', 'window']);
});

test.each(['notifications', 'media', 'geolocation', 'clipboard-read', 'midi'])(
  'a request for %s is denied',
  async (permission) => {
    await ready();
    const [handler] = defaultSession.setPermissionRequestHandler.mock.calls[0];
    const callback = jest.fn();

    handler({}, permission, callback, {
      requestingUrl: 'https://example.com/',
    });

    expect(callback).toHaveBeenCalledWith(false);
  },
);

test.each(['notifications', 'media', 'geolocation', 'clipboard-read', 'midi'])(
  'a check for %s is denied',
  async (permission) => {
    await ready();
    const [handler] = defaultSession.setPermissionCheckHandler.mock.calls[0];

    expect(handler({}, permission, 'file://', {})).toBe(false);
  },
);
