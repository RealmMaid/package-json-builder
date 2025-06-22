// main.js - This script runs the main Electron process.

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); // We need the file system module now!
const { exec } = require('child_process');
const https = require('https'); // The typo is fixed here! Yay!

// This function creates the main application window.
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 950,
    webPreferences: {
      // The preload script is a bridge between the secure main process
      // and the web content in the renderer process.
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file into the window. This is our UI.
  mainWindow.loadFile('index.html');

  // Optional: Open the DevTools for debugging.
  // mainWindow.webContents.openDevTools();
};

// Function to fetch full package details from NPM
const getPackageDetails = (packageName) => {
    return new Promise((resolve, reject) => {
        https.get(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch package: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
};


app.whenReady().then(() => {
  // --- IPC HANDLERS ---
  
  // This handles the request from the UI to open a folder dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (!canceled) {
      return filePaths[0];
    }
  });

  // This handles the request to publish a package
  ipcMain.on('npm:publish', (event, directory) => {
    if (!directory) {
      event.reply('npm:publish-output', 'Error: No directory selected! >.<');
      return;
    }

    // Using exec to run the npm publish command
    const command = exec('npm publish', { cwd: directory });
    command.stdout.on('data', (data) => event.reply('npm:publish-output', data.toString()));
    command.stderr.on('data', (data) => event.reply('npm:publish-output', `ERROR: ${data.toString()}`));
    command.on('close', (code) => event.reply('npm:publish-output', `\n--- Process finished with code ${code} ---`));
  });
  
  // Handle request for full package data
  ipcMain.handle('npm:getPackageDetails', async (event, packageName) => {
      try {
          const details = await getPackageDetails(packageName);
          return details;
      } catch (error) {
          console.error(`Failed to fetch details for ${packageName}:`, error);
          return null;
      }
  });

  // Handle request to take a screenshot!
  ipcMain.handle('app:take-screenshot', async (event, pageRect) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try {
        // Temporarily resize the window to be the full height of the page
        const [originalWidth, originalHeight] = win.getSize();
        win.setSize(originalWidth, pageRect.height, false);

        // A tiny delay to make sure the window has resized before we snap the pic!
        await new Promise(resolve => setTimeout(resolve, 200));

        const image = await win.webContents.capturePage();
        
        // Resize back to normal!
        win.setSize(originalWidth, originalHeight, false);

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Screenshot',
            defaultPath: `package-builder-screenshot-${Date.now()}.png`,
            filters: [{ name: 'PNG Images', extensions: ['png'] }]
        });

        if (!canceled && filePath) {
            fs.writeFileSync(filePath, image.toPNG());
            return { success: true, path: filePath };
        }
        return { success: false };
    } catch (error) {
        console.error('Failed to capture page:', error);
        return { success: false, error: error.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
