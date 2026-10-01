/* global jest, window */

// Tests render the renderer without preload.js, so this stands in for the API
// it exposes on window.electrate. getVersion never answers unless a test says
// what it returns, so components that ask for it do not update after a test
// that ignores it has finished. Tests that run in Node have no window.
if (typeof window !== 'undefined') {
  window.electrate = {
    versions: { node: '', chrome: '', electron: '' },
    getVersion: jest.fn(() => new Promise(() => {})),
  };
}
