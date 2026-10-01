import electron from 'electron';
import path from 'path';
import url from 'url';
import 'babel-polyfill';

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const shell = electron.shell;

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // The renderer gets no Node.js access; preload.js exposes what it needs.
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  // electron-vite sets ELECTRON_RENDERER_URL to the dev server in development.
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../renderer/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
