// preload.js - A bridge between the main process and the renderer process.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Publishing functions
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  publishPackage: (directory) => ipcRenderer.send('npm:publish', directory),
  onPublishOutput: (callback) => ipcRenderer.on('npm:publish-output', (_event, value) => callback(value)),

  // NEW: Function to get full package details for compatibility check
  getPackageDetails: (packageName) => ipcRenderer.invoke('npm:getPackageDetails', packageName),
});
