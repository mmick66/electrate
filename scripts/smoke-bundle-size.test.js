/**
 * @jest-environment node
 */
/* global beforeEach, afterEach, test, expect */

// The smoke test reports the size of the renderer's JavaScript bundle: the .js
// files `npm run build` writes to out/renderer/assets.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { rendererBundleSize } = require('./smoke-packaged-app');

let assets;

beforeEach(() => {
  assets = fs.mkdtempSync(path.join(os.tmpdir(), 'electrate-assets-'));
});

afterEach(() => {
  fs.rmSync(assets, { recursive: true, force: true });
});

test('sums the JavaScript files and leaves out the rest', () => {
  fs.writeFileSync(path.join(assets, 'index-b.js'), 'x'.repeat(300));
  fs.writeFileSync(path.join(assets, 'vendor-a.js'), 'x'.repeat(200));
  fs.writeFileSync(path.join(assets, 'index-c.css'), 'x'.repeat(50));
  fs.writeFileSync(path.join(assets, 'logo.png'), 'x'.repeat(7000));
  expect(rendererBundleSize(assets)).toEqual({
    files: [
      ['index-b.js', 300],
      ['vendor-a.js', 200],
    ],
    total: 500,
  });
});

test('reports nothing for a bundle without JavaScript', () => {
  expect(rendererBundleSize(assets)).toEqual({ files: [], total: 0 });
});
