/* global jest, afterEach, describe, test, expect, require, process */

// The application menu is set before the app is ready, so Electron never
// builds its default one: a minimal menu on macOS, none on a packaged app
// elsewhere, and the View menu in development on every platform.

const mockElectron = {
  app: {
    enableSandbox: jest.fn(),
    isPackaged: true,
    on: jest.fn(),
    // Never ready, so anything main.js sets here it sets before ready.
    whenReady: jest.fn(() => new Promise(() => {})),
  },
  BrowserWindow: jest.fn(),
  ipcMain: { handle: jest.fn() },
  Menu: {
    buildFromTemplate: jest.fn((template) => ({ template })),
    setApplicationMenu: jest.fn(),
  },
  net: { fetch: jest.fn() },
  protocol: { registerSchemesAsPrivileged: jest.fn(), handle: jest.fn() },
  session: { defaultSession: {} },
  shell: { openExternal: jest.fn() },
};

jest.mock('electron', () => mockElectron);

const { app, Menu } = mockElectron;
const platform = Object.getOwnPropertyDescriptor(process, 'platform');

afterEach(() => {
  Object.defineProperty(process, 'platform', platform);
  jest.clearAllMocks();
});

// Loads main.js as the given platform, packaged or in development, and
// returns the roles of the menu it set, or null when it set none.
const menuRoles = (platformName, isPackaged) => {
  Object.defineProperty(process, 'platform', { value: platformName });
  app.isPackaged = isPackaged;
  jest.isolateModules(() => {
    require('./main');
  });
  expect(Menu.setApplicationMenu).toHaveBeenCalledTimes(1);
  const [menu] = Menu.setApplicationMenu.mock.calls[0];
  return menu && menu.template.map((item) => item.role);
};

describe('a packaged app', () => {
  test('on macOS keeps the App, Edit and Window menus', () => {
    expect(menuRoles('darwin', true)).toEqual([
      'appMenu',
      'editMenu',
      'windowMenu',
    ]);
  });

  test.each(['win32', 'linux'])('on %s has no menu', (platformName) => {
    expect(menuRoles(platformName, true)).toBeNull();
    expect(Menu.buildFromTemplate).not.toHaveBeenCalled();
  });
});

describe('in development', () => {
  test('macOS also gets the View menu', () => {
    expect(menuRoles('darwin', false)).toEqual([
      'appMenu',
      'editMenu',
      'viewMenu',
      'windowMenu',
    ]);
  });

  test.each(['win32', 'linux'])('%s gets only the View menu', (name) => {
    expect(menuRoles(name, false)).toEqual(['viewMenu']);
  });
});
