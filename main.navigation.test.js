/* global jest, beforeEach, test, expect, require */

// Every renderer is sandboxed, no frame navigates away from the app, and only
// allowed https: links reach the default browser.

const order = [];

const mockElectron = {
  app: {
    enableSandbox: jest.fn(() => order.push('sandbox')),
    isPackaged: true,
    on: jest.fn(),
    whenReady: jest.fn(() => {
      order.push('ready');
      return Promise.resolve();
    }),
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

const { app, shell } = mockElectron;

// Loads main.js and hands it a new web contents, as Electron does for each
// window; returns the contents' navigation and window-open handlers.
const newContents = () => {
  jest.isolateModules(() => {
    require('./main');
  });
  const [, onCreated] = app.on.mock.calls.find(
    ([event]) => event === 'web-contents-created',
  );
  const listeners = {};
  const contents = {
    on: jest.fn((event, listener) => {
      listeners[event] = listener;
    }),
    setWindowOpenHandler: jest.fn(),
  };
  onCreated({}, contents);
  return {
    navigate: (url, isMainFrame = true) => {
      const navigation = { url, isMainFrame, preventDefault: jest.fn() };
      listeners['will-frame-navigate'](navigation);
      return navigation;
    },
    openWindow: (url) =>
      contents.setWindowOpenHandler.mock.calls[0][0]({ url }),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  order.length = 0;
});

test('the sandbox is enabled for every renderer before the app is ready', () => {
  jest.isolateModules(() => {
    require('./main');
  });

  expect(order).toEqual(['sandbox', 'ready']);
});

test('a link in the page opens in the default browser, not in the app', () => {
  const { navigate } = newContents();

  const navigation = navigate('https://example.com/docs');

  expect(navigation.preventDefault).toHaveBeenCalled();
  expect(shell.openExternal).toHaveBeenCalledWith('https://example.com/docs');
});

test('a subframe cannot navigate, and its link does not leave the app', () => {
  const { navigate } = newContents();

  const navigation = navigate('https://example.com/', false);

  expect(navigation.preventDefault).toHaveBeenCalled();
  expect(shell.openExternal).not.toHaveBeenCalled();
});

test.each([
  'http://example.com/',
  'file:///etc/passwd',
  'javascript:alert(1)',
  'smb://example.com/share',
  'not a url',
])('navigating to %s is blocked and nothing opens', (url) => {
  const { navigate } = newContents();

  const navigation = navigate(url);

  expect(navigation.preventDefault).toHaveBeenCalled();
  expect(shell.openExternal).not.toHaveBeenCalled();
});

test('a new window is denied; an https link opens in the default browser', () => {
  const { openWindow } = newContents();

  expect(openWindow('https://example.com/')).toEqual({ action: 'deny' });
  expect(shell.openExternal).toHaveBeenCalledWith('https://example.com/');
});

test('a new window for an http link is denied and nothing opens', () => {
  const { openWindow } = newContents();

  expect(openWindow('http://example.com/')).toEqual({ action: 'deny' });
  expect(shell.openExternal).not.toHaveBeenCalled();
});
