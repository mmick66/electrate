/**
 * @jest-environment node
 */
/* global jest, test, expect, require, __dirname */

// main.js is plain CommonJS: it runs exactly as written, with no Babel or
// bundler transform, and opens its window once the app is ready.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MAIN = path.join(__dirname, 'main.js');

// Runs the untransformed source of main.js against a fake Electron, the way
// Node's CommonJS loader would, and returns the fake once the app is ready.
const runMain = async () => {
  const windows = [];
  const handlers = {};
  const electron = {
    app: {
      isPackaged: true,
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      whenReady: jest.fn(() => Promise.resolve()),
      quit: jest.fn(),
    },
    BrowserWindow: Object.assign(
      jest.fn(function () {
        windows.push(this);
        this.loadURL = jest.fn();
      }),
      { getAllWindows: () => windows },
    ),
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
  const fakeRequire = (id) => (id === 'electron' ? electron : require(id));

  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) {${fs.readFileSync(MAIN, 'utf8')}\n})`,
    { filename: MAIN },
  );
  const module = { exports: {} };
  wrapper(module.exports, fakeRequire, module, MAIN, path.dirname(MAIN));

  await electron.app.whenReady.mock.results[0].value;
  return { electron, windows, handlers };
};

test('main.js runs without a transform and opens a window once ready', async () => {
  const { windows } = await runMain();

  expect(windows).toHaveLength(1);
  expect(windows[0].loadURL).toHaveBeenCalledWith('app://renderer/index.html');
});

test('activate opens a window only when none is open', async () => {
  const { windows, handlers } = await runMain();

  handlers.activate();
  expect(windows).toHaveLength(1);

  windows.length = 0;
  handlers.activate();
  expect(windows).toHaveLength(1);
});
