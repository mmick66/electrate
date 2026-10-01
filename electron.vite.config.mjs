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
    // The sources use JSX in plain .js files.
    esbuild: {
      include: /\.js$/,
      exclude: [],
      loader: 'jsx'
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' }
      }
    },
    build: {
      rollupOptions: {
        input: resolve('src/index.html')
      }
    }
  }
});
