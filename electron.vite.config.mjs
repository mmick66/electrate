import { resolve } from 'path';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve('main.js') }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve('preload.js') }
      }
    }
  },
  renderer: {
    root: resolve('src'),
    // The sources use JSX in plain .js files, compiled with the automatic
    // runtime that React 19 requires.
    esbuild: {
      include: /\.js$/,
      exclude: [],
      loader: 'jsx',
      jsx: 'automatic'
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
        jsx: 'automatic'
      }
    },
    build: {
      rollupOptions: {
        input: resolve('src/index.html')
      }
    }
  }
});
