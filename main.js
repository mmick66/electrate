// Plain CommonJS, so Electron and Node load this file as it is: no Babel or
// bundler transform is needed to run it.
const {
  app,
  BrowserWindow,
  net,
  protocol,
  session,
  shell,
} = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// The bundled renderer is served from app://renderer/ rather than file://, so
// a page cannot reach any other file the process can read.
const RENDERER_DIR = path.join(__dirname, '../renderer');
const RENDERER_URL = 'app://renderer/index.html';

// Sent as a header on every app:// response. It matches the <meta> CSP in
// src/index.html, which stays as a fallback, plus frame-ancestors, which only
// a header can set. The dev server gets no header: it would block the inline
// React Fast Refresh preamble.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

// Standard and secure, so app:// pages get an origin of their own and the
// same treatment as https:// pages. This must run before the app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

// The file under RENDERER_DIR that an app:// URL names, or null when the
// path, once decoded, resolves outside it.
const rendererFile = (requestUrl) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) {
    return null;
  }
  const file = path.join(RENDERER_DIR, pathname);
  const relative = path.relative(RENDERER_DIR, file);
  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return null;
  }
  return file;
};

const notFound = () => new Response('Not found', { status: 404 });

// Handles app:// requests: the file from out/renderer with the CSP header, or
// 404 for anything missing or outside it.
const serveRenderer = async (request) => {
  const file = rendererFile(request.url);
  if (!file) {
    return notFound();
  }
  let response;
  try {
    response = await net.fetch(pathToFileURL(file).toString());
  } catch {
    return notFound();
  }
  if (!response.ok) {
    return notFound();
  }
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  return new Response(response.body, { status: 200, headers });
};

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
    mainWindow.loadURL(RENDERER_URL);
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
// requestingOrigin (app://renderer when packaged, the dev server in
// development).
const denyPermissions = (permissionSession) => {
  permissionSession.setPermissionRequestHandler(
    (webContents, permission, callback) => callback(false),
  );
  permissionSession.setPermissionCheckHandler(() => false);
};

app.whenReady().then(() => {
  // Before any window exists, so no page ever runs with the defaults.
  denyPermissions(session.defaultSession);
  protocol.handle('app', serveRenderer);
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
