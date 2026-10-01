// Smoke-tests the app that `electron-builder --dir` packaged: its Electron
// fuses read back as build.electronFuses in package.json sets them, and it
// starts and renders its page with the Node.js entry points the fuses close
// turned on in its environment. CI runs it on Linux, macOS and Windows. Run it
// locally after `npm run build && npx electron-builder --dir`, or pass it the
// path to a packaged app (the .app bundle on macOS, the executable elsewhere).

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { FuseV1Options, getCurrentFuseWire } = require('@electron/fuses');
const { name, productName = name, build } = require('../package.json');

const RENDERER_URL = 'app://renderer/index.html';
const TIMEOUT_MS = 60_000;

// The build.electronFuses keys that configure electron-builder rather than
// name a fuse.
const NOT_FUSES = ['resetAdHocDarwinSignature', 'strictlyRequireAllFuses'];

// @electron/fuses reads each fuse as its byte in the fuse wire.
const FUSE_STATES = { 48: 'off', 49: 'on', 114: 'removed', 144: 'unset' };

// The packaged app `electron-builder --dir` writes into distDir for this
// platform: dist/linux-unpacked/electrate, dist/win-unpacked/electrate.exe or
// dist/mac-arm64/electrate.app, with the architecture in the folder name
// unless it is x64.
const findPackagedApp = (distDir, platform, appName) => {
  const folders = {
    linux: /^linux(-\w+)?-unpacked$/,
    win32: /^win(-\w+)?-unpacked$/,
    darwin: /^mac(-\w+)?$/,
  };
  const files = {
    linux: appName,
    win32: `${appName}.exe`,
    darwin: `${appName}.app`,
  };
  if (!folders[platform]) {
    throw new Error(`No packaged app layout is known for ${platform}`);
  }
  const found = fs.existsSync(distDir)
    ? fs.readdirSync(distDir).filter((entry) => folders[platform].test(entry))
    : [];
  if (found.length !== 1) {
    throw new Error(
      `Expected one packaged app in ${distDir}, found ${found.length}; ` +
        'run `npx electron-builder --dir` first or pass its path',
    );
  }
  return path.join(distDir, found[0], files[platform]);
};

// build.electronFuses as @electron/fuses names the fuses, e.g. runAsNode:
// false becomes [FuseV1Options.RunAsNode, 'off'].
const expectedFuses = (config) =>
  Object.entries(config)
    .filter(([key]) => !NOT_FUSES.includes(key))
    .map(([key, enabled]) => {
      const option = FuseV1Options[key[0].toUpperCase() + key.slice(1)];
      if (option === undefined) {
        throw new Error(`build.electronFuses.${key} names no Electron fuse`);
      }
      return [option, enabled ? 'on' : 'off'];
    });

const checkFuses = async (appPath, config) => {
  const wire = await getCurrentFuseWire(appPath);
  const wrong = [];
  for (const [option, state] of expectedFuses(config)) {
    const actual = FUSE_STATES[wire[option]] ?? `byte ${wire[option]}`;
    console.log(`  ${FuseV1Options[option]} is ${actual}`);
    if (actual !== state) {
      wrong.push(`${FuseV1Options[option]} is ${actual}, not ${state}`);
    }
  }
  if (wrong.length > 0) {
    throw new Error(`Fuses not flipped: ${wrong.join('; ')}`);
  }
};

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getJson = async (url) => (await fetch(url)).json();

// A minimal Chrome DevTools Protocol client on one WebSocket.
const connect = async (url) => {
  const socket = new WebSocket(url);
  const pending = new Map();
  let lastId = 0;
  socket.addEventListener('message', ({ data }) => {
    const { id, result, error } = JSON.parse(data);
    const call = pending.get(id);
    if (call) {
      pending.delete(id);
      if (error) {
        call.reject(new Error(error.message));
      } else {
        call.resolve(result);
      }
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        lastId += 1;
        pending.set(lastId, { resolve, reject });
        socket.send(JSON.stringify({ id: lastId, method, params }));
      }),
    close: () => socket.close(),
  };
};

// What the page shows once loaded: its title, whether it rendered any text
// and whether every image came through app://.
const RENDERED = `({
  title: document.title,
  rendered:
    document.readyState === 'complete' &&
    document.body.innerText.trim() !== '' &&
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
})`;

// Waits until the app's window shows its page, rendered, and returns what it
// shows. Fails as soon as the app exits.
const waitForPage = async (port, exited) => {
  const deadline = Date.now() + TIMEOUT_MS;
  let last = 'no page yet';
  while (Date.now() < deadline) {
    if (exited.code !== undefined) {
      throw new Error(`The app exited with ${exited.code} before rendering`);
    }
    try {
      const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
      const page = targets.find((target) => target.type === 'page');
      last = page ? `page at ${page.url}` : last;
      if (page && page.url === RENDERER_URL) {
        const devtools = await connect(page.webSocketDebuggerUrl);
        try {
          const { result } = await devtools.send('Runtime.evaluate', {
            expression: RENDERED,
            returnByValue: true,
          });
          if (result.value?.rendered) {
            return result.value;
          }
          last = `${RENDERER_URL} loaded but not rendered`;
        } finally {
          devtools.close();
        }
      }
    } catch {
      // DevTools is not listening yet.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${RENDERER_URL}: ${last}`);
};

// Starts the app with remote debugging and a throwaway profile, with every
// Node.js entry point that build.electronFuses turns off tried anyway. Were
// ELECTRON_RUN_AS_NODE still honoured, the app would run as plain Node.js and
// never render; the others leave a sign in its stderr, returned with the
// app as [pattern, what it means] pairs.
const launch = (appPath, port, userData) => {
  const fuses = build.electronFuses;
  const env = { ...process.env };
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
  ];
  const signs = [];
  if (fuses.runAsNode === false) {
    env.ELECTRON_RUN_AS_NODE = '1';
  }
  if (fuses.enableNodeOptionsEnvironmentVariable === false) {
    // A packaged app drops --require, but says so when it reads NODE_OPTIONS.
    env.NODE_OPTIONS = `--require ${path.join(userData, 'missing.js')}`;
    signs.push([/NODE_OPTION/, 'The app read NODE_OPTIONS']);
  }
  if (fuses.enableNodeCliInspectArguments === false) {
    args.push('--inspect=0');
    signs.push([/Debugger listening/, 'The app started a Node.js inspector']);
  }
  const executable = appPath.endsWith('.app')
    ? path.join(appPath, 'Contents', 'MacOS', path.basename(appPath, '.app'))
    : appPath;
  const app = spawn(executable, args, {
    env,
    stdio: ['ignore', 'inherit', 'pipe'],
  });
  return { app, signs };
};

// Closes the app through DevTools, as a user closing its window would, and
// kills it if it has not exited in time.
const quit = async (app, port, exited) => {
  if (exited.code !== undefined) {
    return;
  }
  try {
    const { webSocketDebuggerUrl } = await getJson(
      `http://127.0.0.1:${port}/json/version`,
    );
    const devtools = await connect(webSocketDebuggerUrl);
    devtools.send('Browser.close').catch(() => {});
  } catch {
    // Killed below.
  }
  for (let waited = 0; waited < 10_000; waited += 250) {
    if (exited.code !== undefined) {
      return;
    }
    await sleep(250);
  }
  app.kill();
};

const main = async () => {
  if (!build.electronFuses) {
    throw new Error('package.json sets no build.electronFuses');
  }
  const appPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : findPackagedApp(
        path.join(__dirname, '..', build.directories?.output ?? 'dist'),
        process.platform,
        productName,
      );

  console.log(`Fuses of ${appPath}:`);
  await checkFuses(appPath, build.electronFuses);

  const port = await freePort();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'electrate-smoke-'));
  const { app, signs } = launch(appPath, port, userData);
  const exited = {};
  let stderr = '';
  app.stderr.on('data', (chunk) => {
    stderr += chunk;
    process.stderr.write(chunk);
  });
  app.on('exit', (code, signal) => {
    exited.code = code ?? signal;
  });
  app.on('error', (error) => {
    exited.code = error.message;
  });

  try {
    const page = await waitForPage(port, exited);
    console.log(`Rendered ${RENDERER_URL} ("${page.title}")`);
    for (const [pattern, meaning] of signs) {
      if (pattern.test(stderr)) {
        throw new Error(meaning);
      }
    }
  } finally {
    await quit(app, port, exited);
    fs.rmSync(userData, { recursive: true, force: true, maxRetries: 5 });
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { findPackagedApp, expectedFuses };
