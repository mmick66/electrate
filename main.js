// Plain CommonJS, so Electron and Node load this file as it is: no Babel or
// bundler transform is needed to run it.
const { app, BrowserWindow, session, shell } = require('electron');
const path = require('node:path');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // The renderer gets no Node.js access; preload.js exposes what it needs.
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // electron-vite sets ELECTRON_RENDERER_URL to the dev server in development.
  // A packaged app ignores it, so the environment cannot point the window at
  // a remote page.
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

// Links to the web open in the default browser; the app's own windows never
// navigate away from the app or open new windows.
const openExternally = (target) => {
  const { protocol } = new URL(target);
  if (protocol === 'https:' || protocol === 'http:') {
    shell.openExternal(target);
  }
};

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, target) => {
    navigationEvent.preventDefault();
    openExternally(target);
  });
  contents.setWindowOpenHandler(({ url: target }) => {
    openExternally(target);
    return { action: 'deny' };
  });
});

// Electron grants any permission a page asks for (camera, microphone,
// notifications, geolocation, ...) unless the app decides otherwise. The
// template uses none, so it denies them all. To allow one, grant it in both
// handlers, and only to the app's own page: the request handler gets the
// page's URL as details.requestingUrl, the check handler its origin as
// requestingOrigin (file:// when packaged, the dev server in development).
const denyPermissions = (permissionSession) => {
  permissionSession.setPermissionRequestHandler(
    (webContents, permission, callback) => callback(false),
  );
  permissionSession.setPermissionCheckHandler(() => false);
};

app.whenReady().then(() => {
  // Before any window exists, so no page ever runs with the defaults.
  denyPermissions(session.defaultSession);
  createWindow();

  // On macOS the app stays open with no windows; clicking the dock icon
  // opens a new one.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
