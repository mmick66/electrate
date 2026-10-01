import { contextBridge } from 'electron';

// The renderer runs sandboxed with context isolation and no Node.js access.
// Anything it needs from Node or Electron is exposed here, deliberately and
// narrowly, through contextBridge. Never expose ipcRenderer or require itself.
contextBridge.exposeInMainWorld('electrate', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
