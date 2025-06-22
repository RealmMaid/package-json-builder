// preload.js - A bridge between the main process and the renderer process.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Publishing functions
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  publishPackage: (directory) => ipcRenderer.send('npm:publish', directory),
  onPublishOutput: (callback) => ipcRenderer.on('npm:publish-output', (_event, value) => callback(value)),

  // Function to get full package details
  getPackageDetails: (packageName) => ipcRenderer.invoke('npm:getPackageDetails', packageName),

  // Updated screenshot function that sends the page size!
  takeScreenshot: (pageRect) => ipcRenderer.invoke('app:take-screenshot', pageRect)
});
