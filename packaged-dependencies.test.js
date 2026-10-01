/* global test, expect, require, __dirname */

// electron-builder copies every package in `dependencies` into app.asar, but
// Vite bundles the renderer's packages (React and the rest) into out/renderer.
// So `dependencies` lists exactly the packages the main process and preload
// script load at run time, and everything else is a devDependency.

const fs = require('node:fs');
const { builtinModules } = require('node:module');
const path = require('node:path');
const { dependencies = {} } = require('./package.json');

// The package each require() or import in a file names, without Node.js
// built-ins or electron, which the Electron runtime provides.
const packagesLoadedBy = (file) => {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const specifiers = [
    ...source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...source.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm),
  ].map(([, specifier]) => specifier);
  return specifiers
    .filter((specifier) => !specifier.startsWith('.'))
    .map((specifier) => {
      const parts = specifier.split('/');
      return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    })
    .filter(
      (name) =>
        name !== 'electron' &&
        !name.startsWith('node:') &&
        !builtinModules.includes(name),
    );
};

test('dependencies are exactly what the main process and preload load', () => {
  const loaded = new Set([
    ...packagesLoadedBy('main.js'),
    ...packagesLoadedBy('preload.js'),
  ]);
  expect(Object.keys(dependencies).sort()).toEqual([...loaded].sort());
});

test('the renderer packages Vite bundles are devDependencies', () => {
  expect(dependencies).not.toHaveProperty('react');
  expect(dependencies).not.toHaveProperty('react-dom');
});
