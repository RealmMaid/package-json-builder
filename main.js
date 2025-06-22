// main.js - This script runs the main Electron process.

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

// This function creates the main application window.
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 950,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('index.html');
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
  
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!canceled) return filePaths[0];
  });

  ipcMain.on('npm:publish', (event, directory) => {
    if (!directory) return event.reply('npm:publish-output', 'Error: No directory selected! >.<');
    const command = exec('npm publish', { cwd: directory });
    command.stdout.on('data', data => event.reply('npm:publish-output', data.toString()));
    command.stderr.on('data', data => event.reply('npm:publish-output', `ERROR: ${data.toString()}`));
    command.on('close', code => event.reply('npm:publish-output', `\n--- Process finished with code ${code} ---`));
  });
  
  // NEW: Handle request for full package data
  ipcMain.handle('npm:getPackageDetails', async (event, packageName) => {
      try {
          const details = await getPackageDetails(packageName);
          return details;
      } catch (error) {
          console.error(`Failed to fetch details for ${packageName}:`, error);
          return null;
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
