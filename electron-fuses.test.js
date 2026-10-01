/* global test, expect, require */

// The packaged app is built with the Electron fuses the security checklist
// asks for: no running as Node.js, no NODE_OPTIONS or --inspect, only a
// verified app.asar, encrypted cookies and no extra file:// privileges.

const { build } = require('./package.json');

test('electron-builder flips the security fuses', () => {
  expect(build.electronFuses).toEqual({
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableCookieEncryption: true,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    grantFileProtocolExtraPrivileges: false,
    resetAdHocDarwinSignature: true,
  });
});

test('the app is packaged into an asar archive the fuses can verify', () => {
  expect(build.asar).not.toBe(false);
});
