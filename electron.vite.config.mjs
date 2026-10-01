import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve('main.js') },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve('preload.js') },
      },
    },
  },
  renderer: {
    root: resolve('src'),
    // Compiles JSX with the automatic runtime and, in development, applies
    // component edits in place with React Fast Refresh. Its inline preamble
    // script runs only because Vite injects it ahead of the CSP <meta> in
    // src/index.html; a CSP sent as a header would block it.
    plugins: [react()],
    build: {
      // electron-vite leaves every bundle unminified, and React 19 ships no
      // minified production build, so the renderer would be three times the
      // size, all parsed before the window first renders. Main and preload
      // stay unminified for readable stack traces. The source map, served
      // from out/renderer like the bundle, keeps renderer errors readable in
      // DevTools.
      minify: 'esbuild',
      sourcemap: true,
      rollupOptions: {
        input: resolve('src/index.html'),
      },
    },
  },
});
