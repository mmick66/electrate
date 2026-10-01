/* global test, expect, require */

// Gatekeeper only opens an app on other Macs if it is signed with a Developer
// ID certificate, under the hardened runtime, and notarized by Apple.
// electron-builder signs with the identity it finds and notarizes when the
// Apple credentials are in the environment (see "Signing and notarizing" in
// README.md), so the config must not turn either off.

const { build } = require('./package.json');

test('the macOS app is signed under the hardened runtime and notarized', () => {
  expect(build.mac.hardenedRuntime).toBe(true);
  expect(build.mac.notarize).toBe(true);
  expect(build.mac.identity).not.toBeNull();
});

test('the macOS app is built for Apple silicon and Intel Macs', () => {
  const archs = build.mac.target.flatMap((target) => target.arch);
  expect(archs).toEqual(expect.arrayContaining(['arm64', 'x64']));
});

test('each macOS architecture gets its own file name', () => {
  expect(build.mac.artifactName).toContain('${arch}');
});
