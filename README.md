# Electrate

<p align="center"> 
  <img src="https://github.com/mmick66/electrate/blob/master/assets/logo.png">
</p>

This is a simple [Electron](https://electronjs.org/) + [React.js](https://reactjs.org/) template (with live reload), built with [electron-vite](https://electron-vite.org/). In development the renderer is served by the Vite dev server, so CSS changes apply instantly and JavaScript changes reload the window; the packaged app loads the bundled renderer from disk. The original design is explained [in my article on Medium](https://medium.com/@michael.m/creating-an-electron-and-react-template-5173d086549a).

## Installing

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/mmick66/electrate my-app
# Go into the repository
cd my-app
# Install dependencies
npm install
```

## Running

```
npm run start
```

## Testing

The tool of choice is [Jest](https://facebook.github.io/jest/docs/en/tutorial-react.html) as used at Facebook. Create files with the extension `*.test.js` and they will be run through

```
npm run test
```

## Linting

[ESLint](https://eslint.org/) (configured in `eslint.config.mjs`) checks the code and runs in CI; [Prettier](https://prettier.io/) formats it.

```
npm run lint
npm run format
```

## Packaging

Replace `build/icon.png` with your own icon (a square PNG, at least 1024x1024) and run

```bash
npm run release
```

Check the `dist` folder for the app. [electron-builder](https://www.electron.build/icons) generates the macOS, Windows and Linux icons from that one PNG.


## How Electron Works with React

[electron-vite](https://electron-vite.org/) bundles `main.js` into `out/main` and the renderer (`src/index.html` with its scripts and styles) into `out/renderer`; files in `src/public` are copied as they are. `npm start` runs the dev server and restarts Electron when `main.js` changes, `npm run build` writes `out`, and `npm run release` packages `out` with [electron-builder](https://www.electron.build/). The configuration is in `electron.vite.config.mjs`.

The renderer runs sandboxed with context isolation and no Node.js access, under a strict Content Security Policy (set in `src/index.html`). Anything it needs from Node or Electron goes through `preload.js`, which exposes a small API on `window.electrate` with `contextBridge`.


<p align="center"> 
  <img src="https://preview.ibb.co/jF9Akx/electron_sequence.png" alt="electron_sequence" border="0">
</p>


## Extending the Template

Some useful tools include:

1. [Spectron](https://electronjs.org/spectron)
2. [Karma](https://karma-runner.github.io/2.0/index.html) + [Jasmine](https://jasmine.github.io/)
3. [Ant Design](https://ant.design/) (a React based UI Framework)


## Copyright

The template is made available through the [Creative Commons Licence](https://creativecommons.org/publicdomain/zero/1.0/). The logo icon was provided by [Vecteezy](https://www.vecteezy.com/).

