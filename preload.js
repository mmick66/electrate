import { contextBridge, ipcRenderer } from 'electron';

// The renderer runs sandboxed with context isolation and no Node.js access.
// Anything it needs from Node or Electron is exposed here, deliberately and
// narrowly, through contextBridge. Never expose ipcRenderer or require itself.
contextBridge.exposeInMainWorld('electrate', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // One function per IPC channel, which sends only what the channel takes
  // and returns only the result: never the IPC event, which would hand the
  // page ipcRenderer through event.sender. main.js handles the channel.
  getVersion: () => ipcRenderer.invoke('electrate:get-version'),
});
