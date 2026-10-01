/**
 * @jest-environment node
 */
/* global jest, beforeAll, afterAll, test, expect, require, __dirname, Response */

// The bundled renderer is served from app://renderer/, mapped onto
// out/renderer, with the CSP as a response header. Nothing outside
// out/renderer can be reached, however the path is written.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath } = require('node:url');

const MAIN = path.join(__dirname, 'main.js');

let out;

// A stand-in for the build output: main.js runs from out/main, beside
// out/renderer, with a file in out/ that the renderer must not reach.
beforeAll(() => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), 'electrate-app-protocol-'));
  fs.mkdirSync(path.join(out, 'main'));
  fs.mkdirSync(path.join(out, 'renderer', 'assets'), { recursive: true });
  fs.writeFileSync(path.join(out, 'renderer', 'index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(out, 'renderer', 'assets', 'index.js'), '1;');
  fs.writeFileSync(path.join(out, 'secret.txt'), 'secret');
});

afterAll(() => {
  fs.rmSync(out, { recursive: true, force: true });
});

// Runs main.js from out/main against a fake Electron whose net.fetch reads
// file:// URLs from disk, and returns the fake once the app is ready.
const runMain = async () => {
  const electron = {
    app: {
      enableSandbox: jest.fn(),
      isPackaged: true,
      on: jest.fn(),
      whenReady: jest.fn(() => Promise.resolve()),
    },
    BrowserWindow: Object.assign(
      jest.fn(function () {
        this.loadURL = jest.fn();
      }),
      { getAllWindows: () => [] },
    ),
    net: {
      fetch: jest.fn(async (url) => {
        const body = fs.readFileSync(fileURLToPath(url));
        return new Response(body, { headers: { 'Content-Type': 'text/html' } });
      }),
    },
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
  const filename = path.join(out, 'main', 'index.js');

  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) {${fs.readFileSync(MAIN, 'utf8')}\n})`,
    { filename: MAIN },
  );
  const module = { exports: {} };
  wrapper(
    module.exports,
    fakeRequire,
    module,
    filename,
    path.dirname(filename),
  );

  await electron.app.whenReady.mock.results[0].value;
  return electron;
};

// Requests a URL from the app:// handler main.js registers.
const request = async (url) => {
  const electron = await runMain();
  const [, handler] = electron.protocol.handle.mock.calls[0];
  const response = await handler({ url });
  return { electron, response };
};

test('app is registered as a standard, secure scheme and handled once ready', async () => {
  const electron = await runMain();

  expect(electron.protocol.registerSchemesAsPrivileged).toHaveBeenCalledWith([
    {
      scheme: 'app',
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
  expect(electron.protocol.handle).toHaveBeenCalledWith(
    'app',
    expect.any(Function),
  );
});

test('serves files from out/renderer with the CSP as a header', async () => {
  const { response } = await request('app://renderer/index.html');

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('<!doctype html>');
  expect(response.headers.get('Content-Type')).toBe('text/html');
  expect(response.headers.get('Content-Security-Policy')).toContain(
    "default-src 'self'",
  );
  expect(response.headers.get('Content-Security-Policy')).toContain(
    "frame-ancestors 'none'",
  );
});

test('serves files in subdirectories of out/renderer', async () => {
  const { response } = await request('app://renderer/assets/index.js');

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('1;');
});

test.each([
  // Chromium and the URL parser resolve plain and %2e dot segments before the
  // handler sees them, so these stay inside out/renderer and are not found.
  'app://renderer/../secret.txt',
  'app://renderer/%2e%2e/secret.txt',
  // Encoded separators only become .. segments once decoded.
  'app://renderer/..%2fsecret.txt',
  'app://renderer/..%2F..%2F..%2Fetc%2Fpasswd',
  'app://renderer/assets/..%2f..%2fsecret.txt',
  'app://renderer/..%5csecret.txt',
  'app://renderer/%2e%2e%2fsecret.txt',
  'app://renderer/%252e%252e%252fsecret.txt',
  // Malformed escapes and NUL bytes are refused outright.
  'app://renderer/%E0%A4%A',
  'app://renderer/index.html%00.png',
  // The renderer directory itself is not a file.
  'app://renderer/',
])('%s is not found and reads nothing outside out/renderer', async (url) => {
  const { electron, response } = await request(url);

  expect(response.status).toBe(404);
  for (const [fileUrl] of electron.net.fetch.mock.calls) {
    const file = fileURLToPath(fileUrl);
    expect(file.startsWith(path.join(out, 'renderer') + path.sep)).toBe(true);
  }
});

test('a missing file under out/renderer is not found', async () => {
  const { response } = await request('app://renderer/missing.js');

  expect(response.status).toBe(404);
  expect(response.headers.get('Content-Security-Policy')).toBeNull();
});
