/* global jest, beforeEach, test, expect, require, __dirname */

// Every window opens hidden, with the page's background colour, and shows
// once its page has painted, so it never shows blank or in another colour.

const fs = require('node:fs');
const path = require('node:path');

const mockElectron = {
  app: {
    enableSandbox: jest.fn(),
    isPackaged: true,
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  BrowserWindow: Object.assign(
    jest.fn(function () {
      const listeners = {};
      this.loadURL = jest.fn();
      this.show = jest.fn();
      this.once = jest.fn((event, listener) => {
        listeners[event] = listener;
      });
      this.emit = (event) => listeners[event]?.();
    }),
    { getAllWindows: () => [] },
  ),
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

// Runs main.js until the app is ready and returns its first window with the
// options it was created with.
const firstWindow = async () => {
  jest.isolateModules(() => {
    require('./main');
  });
  await mockElectron.app.whenReady.mock.results[0].value;
  const { BrowserWindow } = mockElectron;
  return {
    window: BrowserWindow.mock.instances[0],
    options: BrowserWindow.mock.calls[0][0],
  };
};

// The handler that opens a window when the dock icon is clicked on macOS.
const activate = () =>
  mockElectron.app.on.mock.calls.find(([event]) => event === 'activate')[1];

beforeEach(() => {
  jest.clearAllMocks();
});

test('the main window opens hidden and shows on ready-to-show', async () => {
  const { window, options } = await firstWindow();

  expect(options.show).toBe(false);
  expect(window.show).not.toHaveBeenCalled();

  window.emit('ready-to-show');
  expect(window.show).toHaveBeenCalledTimes(1);
});

test('a window opened on activate also waits for ready-to-show', async () => {
  await firstWindow();

  activate()();
  const { BrowserWindow } = mockElectron;
  const window = BrowserWindow.mock.instances[1];
  expect(BrowserWindow.mock.calls[1][0].show).toBe(false);
  expect(window.show).not.toHaveBeenCalled();

  window.emit('ready-to-show');
  expect(window.show).toHaveBeenCalledTimes(1);
});

test("the window's background matches the page's body background", async () => {
  const { options } = await firstWindow();
  const css = fs.readFileSync(path.join(__dirname, 'src', 'index.css'), 'utf8');
  const body = css.match(/(?:^|\n)body\s*\{([^}]*)\}/)[1];
  const background = body.match(/background(?:-color)?\s*:\s*([^;]+);/)[1];

  expect(options.backgroundColor.toLowerCase()).toBe(
    background.trim().toLowerCase(),
  );
});
