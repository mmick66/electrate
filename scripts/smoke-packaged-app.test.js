/**
 * @jest-environment node
 */
/* global beforeEach, afterEach, describe, test, expect */

// The smoke test finds the app electron-builder --dir packaged for each
// platform and reads build.electronFuses as the fuses it must find flipped.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FuseV1Options } = require('@electron/fuses');
const { findPackagedApp, expectedFuses } = require('./smoke-packaged-app');

describe('findPackagedApp', () => {
  let dist;

  beforeEach(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'electrate-dist-'));
  });

  afterEach(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  test.each([
    ['linux', 'linux-unpacked', 'electrate'],
    ['linux', 'linux-arm64-unpacked', 'electrate'],
    ['win32', 'win-unpacked', 'electrate.exe'],
    ['win32', 'win-arm64-unpacked', 'electrate.exe'],
    ['darwin', 'mac', 'electrate.app'],
    ['darwin', 'mac-arm64', 'electrate.app'],
  ])('on %s finds %s/%s', (platform, folder, file) => {
    fs.mkdirSync(path.join(dist, folder));
    fs.writeFileSync(path.join(dist, 'builder-debug.yml'), '');
    expect(findPackagedApp(dist, platform, 'electrate')).toBe(
      path.join(dist, folder, file),
    );
  });

  test('fails when nothing is packaged', () => {
    expect(() => findPackagedApp(dist, 'linux', 'electrate')).toThrow(
      /found 0/,
    );
    expect(() =>
      findPackagedApp(path.join(dist, 'missing'), 'linux', 'electrate'),
    ).toThrow(/found 0/);
  });

  test('fails when it cannot tell which app to check', () => {
    fs.mkdirSync(path.join(dist, 'mac'));
    fs.mkdirSync(path.join(dist, 'mac-arm64'));
    expect(() => findPackagedApp(dist, 'darwin', 'electrate')).toThrow(
      /found 2/,
    );
  });
});

describe('expectedFuses', () => {
  test('names each fuse and the state it must be in', () => {
    expect(
      expectedFuses({
        runAsNode: false,
        enableCookieEncryption: true,
        resetAdHocDarwinSignature: true,
      }),
    ).toEqual([
      [FuseV1Options.RunAsNode, 'off'],
      [FuseV1Options.EnableCookieEncryption, 'on'],
    ]);
  });

  test('rejects a key that names no fuse', () => {
    expect(() => expectedFuses({ runAsNod: false })).toThrow(/runAsNod/);
  });
});
