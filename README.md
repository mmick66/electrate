# Electrate

<p align="center">
  <img src="assets/logo.png" alt="Electrate logo">
</p>

This is a simple [Electron](https://electronjs.org/) + [React](https://react.dev/) template (with live reload), built with [electron-vite](https://electron-vite.org/). In development the renderer is served by the Vite dev server, so CSS changes apply instantly and React component edits apply in place with Fast Refresh, keeping component state; the packaged app loads the bundled renderer from disk. The original design is explained [in my article on Medium](https://medium.com/@michael.m/creating-an-electron-and-react-template-5173d086549a).

## Installing

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) 22.18 or later (which comes with [npm](https://www.npmjs.com/)) installed on your computer; `.nvmrc` pins the version CI uses. From your command line:

```bash
# Clone this repository
git clone https://github.com/mmick66/electrate my-app
# Go into the repository
cd my-app
# Install dependencies
npm install
```

## Running

```bash
npm start
```

This starts the Vite dev server and opens the app in Electron.

## Testing

Tests run with [Jest](https://jestjs.io/docs/tutorial-react) in a [jsdom](https://github.com/jsdom/jsdom) environment, and React components are tested with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (see `src/app.test.jsx`). Create files with the extension `*.test.js` (`*.test.jsx` if they contain JSX) and they will be run through

```bash
npm test
```

CI also packages the app on Linux, macOS and Windows, with `electron-builder --dir` so no installer is made, and smoke-tests it with `scripts/smoke-packaged-app.js`: the app's Electron fuses must read back as `build.electronFuses` in `package.json` sets them, and the app must start and render its page even with `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and `--inspect` set. It also reports, without failing on either, how long the app took from launch to rendering its page (`Time to rendered: … ms`) and the size of the renderer's JavaScript bundle in `out/renderer/assets` (`Renderer JS bundle: … bytes`); find both in the log of the "Smoke-test the packaged app" step of each `package` job, and in the summary of each job's run. Runner timings vary from run to run, so compare a few runs rather than one. To run it yourself:

```bash
npm run build
npx electron-builder --dir
node scripts/smoke-packaged-app.js
```

## Linting

[ESLint](https://eslint.org/) (configured in `eslint.config.mjs`) checks the code and [Prettier](https://prettier.io/) formats it; CI runs both (`npm run format:check`).

```bash
npm run lint
npm run format
```

## Packaging

Replace `build/icon.png` with your own icon (a square PNG, at least 1024x1024) and run

```bash
npm run release
```

Check the `dist` folder for the app. [electron-builder](https://www.electron.build/icons) generates the macOS, Windows and Linux icons from that one PNG.

Vite bundles the packages the renderer imports, React among them, into `out/renderer`, so install those with `npm install --save-dev`. electron-builder copies every package in `dependencies` into the app, so list there only the packages `main.js` or `preload.js` load at run time; `packaged-dependencies.test.js` checks this.

The packaged app has its [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses) set, in `build.electronFuses` in `package.json`. It ignores `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and `--inspect`, loads its code only from an `app.asar` it verifies, encrypts its cookies and gives `file://` pages no extra privileges. Check them with `npx @electron/fuses read --app <path to the packaged app>`. Turning cookie encryption back off in a later release makes users lose their cookies. `process.fork` needs `ELECTRON_RUN_AS_NODE`; use a [utility process](https://www.electronjs.org/docs/latest/api/utility-process) instead. Flipping fuses breaks the code signature on macOS, and Apple silicon kills an app whose signature is broken, so `resetAdHocDarwinSignature` signs it again ad hoc; with a signing identity, electron-builder then signs it properly.

### Signing and notarizing for macOS

On macOS, `npm run release` builds a DMG for Apple silicon (`electrate-1.0.0-arm64.dmg`) and one for Intel Macs (`electrate-1.0.0-x64.dmg`). Without a signing identity the app is only signed ad hoc: it runs on the Mac that built it, but Gatekeeper blocks it on others. To ship it you need an [Apple Developer Program](https://developer.apple.com/programs/) membership and a **Developer ID Application** certificate. electron-builder signs the app with that certificate under the hardened runtime (`build.mac.hardenedRuntime`), then sends it to Apple to be notarized and staples the ticket to it (`build.mac.notarize`). Give it the credentials in environment variables:

- The certificate: install it in your login keychain and electron-builder finds it, or export it as a `.p12` file and set `CSC_LINK` to its path (or its base64 contents) and `CSC_KEY_PASSWORD` to its password.
- Notarization, one of:
  - an [App Store Connect API key](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api) (recommended): `APPLE_API_KEY` (the path to the `.p8` file), `APPLE_API_KEY_ID` and `APPLE_API_ISSUER`;
  - your Apple ID: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` (an [app-specific password](https://support.apple.com/en-us/102654)) and `APPLE_TEAM_ID`;
  - a `notarytool` keychain profile: `APPLE_KEYCHAIN_PROFILE`, and `APPLE_KEYCHAIN` if it is not in the default keychain.

```bash
export CSC_LINK=~/certs/developer-id.p12 CSC_KEY_PASSWORD=...
export APPLE_API_KEY=~/keys/AuthKey_ABC123.p8 APPLE_API_KEY_ID=ABC123 APPLE_API_ISSUER=...
npm run release
# Check that Gatekeeper accepts it and the notarization ticket is stapled
spctl --assess --type execute --verbose dist/mac-arm64/electrate.app
xcrun stapler validate dist/mac-arm64/electrate.app
```

Without the notarization variables electron-builder signs the app but skips notarization with a warning, and Gatekeeper still blocks it. The hardened runtime allows only what an app lists in its entitlements; electron-builder's default ones (`com.apple.security.cs.allow-jit` and the others in its `templates/entitlements.mac.plist`) let Electron run, and you can replace them with your own in `build/entitlements.mac.plist`. Set `CSC_IDENTITY_AUTO_DISCOVERY=false` to skip signing altogether, as CI does.

## How Electron Works with React

[electron-vite](https://electron-vite.org/) bundles `main.js` into `out/main` and the renderer (`src/index.html` with its scripts and styles) into `out/renderer`; files in `src/public` are copied as they are. `npm start` runs the dev server and restarts Electron when `main.js` changes, `npm run build` writes `out`, and `npm run release` packages `out` with [electron-builder](https://www.electron.build/). The configuration is in `electron.vite.config.mjs`.

The renderer runs sandboxed with context isolation and no Node.js access, under a strict Content Security Policy (set in `src/index.html`). Anything it needs from Node or Electron goes through `preload.js`, which exposes a small API on `window.electrate` with `contextBridge`.

The app shows its version with one example of [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc) done securely; copy it for your own channels. `main.js` handles the `electrate:get-version` channel with `ipcMain.handle`, and the handler first checks that `event.senderFrame` is the app's own page (`app://renderer`, or the dev server in development) and that the call has the arguments it expects, and throws otherwise. `preload.js` exposes only a wrapper, `window.electrate.getVersion()`, which calls `ipcRenderer.invoke` and returns only its result; never expose `ipcRenderer` itself or pass the IPC event to the page. `src/app-version.jsx` calls it, and `main.ipc.test.js` tests the checks.

The app's windows never navigate away from the app or open new windows. A link the user follows opens in the default browser instead, if it is an `https:` address; `isAllowedExternalUrl` in `main.js` decides which links may leave the app, so narrow it there to the sites your app links to.

`main.js` sets the application menu before the app is ready, so Electron never builds its default one. On macOS it keeps the App, Edit and Window menus, which make Cmd+C/V/X/A/Z and Cmd+Q work; on Windows and Linux the packaged app has no menu bar, since text fields handle those shortcuts without one. In development every platform also gets the View menu, for reload and DevTools. Add your own menus to `applicationMenu` in `main.js`.

```mermaid
flowchart LR
  electron([Electron]) -- runs --> main["main.js<br/>creates the BrowserWindow"]
  main -- "loads before the page" --> preload["preload.js<br/>exposes window.electrate"]
  main -- loads --> html["src/index.html"]
  html -- "#lt;script type=module#gt;" --> index["src/index.jsx<br/>createRoot(...).render(#lt;App /#gt;)"]
  index -- imports --> app["src/app.jsx<br/>the App component"]
  preload -. contextBridge .-> index
```

## Extending the Template

Some useful tools include:

1. [Playwright](https://playwright.dev/docs/api/class-electron), for end-to-end tests that launch and drive the Electron app
2. [Ant Design](https://ant.design/) (a React based UI Framework)

## Copyright

The template is made available through the [Creative Commons Licence](https://creativecommons.org/publicdomain/zero/1.0/). The logo icon was provided by [Vecteezy](https://www.vecteezy.com/).
