import js from '@eslint/js';
import react from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  { ignores: ['out/', 'dist/'] },

  js.configs.recommended,

  // Electron main process, preload script and build config run on Node.
  {
    files: ['main.js', 'preload.js', '*.config.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  // The main process is plain CommonJS, loaded without a transform.
  {
    files: ['main.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  // So are the scripts CI runs with Node.
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },

  // The renderer is React, with JSX in .jsx files.
  {
    files: ['src/**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    settings: { react: { version: 'detect' } },
  },
  // JSX uses the automatic runtime, so React need not be in scope.
  { files: ['src/**/*.{js,jsx}'], ...react.configs.flat['jsx-runtime'] },

  {
    files: ['src/**/*.test.{js,jsx}'],
    languageOptions: { globals: globals.jest },
  },

  // Formatting is Prettier's job; turn off the ESLint rules that clash with it.
  prettier,
];
