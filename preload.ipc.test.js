/* global jest, beforeEach, test, expect, require */

// preload.js exposes IPC to the page only as narrow wrapper functions, never
// ipcRenderer itself or the IPC event.

const mockElectron = {
  contextBridge: { exposeInMainWorld: jest.fn() },
  ipcRenderer: { invoke: jest.fn(() => Promise.resolve('1.2.3')) },
};

jest.mock('electron', () => mockElectron);

// The API preload.js exposes on window.electrate.
const exposed = () => {
  jest.isolateModules(() => {
    require('./preload');
  });
  const [[name, api]] = mockElectron.contextBridge.exposeInMainWorld.mock.calls;
  expect(name).toBe('electrate');
  return api;
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('getVersion invokes electrate:get-version with no arguments', async () => {
  const { getVersion } = exposed();

  await expect(getVersion('ignored')).resolves.toBe('1.2.3');
  expect(mockElectron.ipcRenderer.invoke.mock.calls).toEqual([
    ['electrate:get-version'],
  ]);
});

test('ipcRenderer itself is not exposed', () => {
  const api = exposed();

  const values = [...Object.values(api), ...Object.values(api.versions)];
  expect(values).not.toContain(mockElectron.ipcRenderer);
  expect(values).not.toContain(mockElectron.ipcRenderer.invoke);
});
