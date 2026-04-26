const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs'); 


app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 400, height: 160,
    frame: false, transparent: true, alwaysOnTop: true,
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false 
    }
  });
  win.loadFile('index.html');

   const promptPath = path.join(__dirname, 'prompt.txt');
  fs.watchFile(promptPath, (curr, prev) => {
    if (fs.existsSync(promptPath)) {
      const msg = fs.readFileSync(promptPath, 'utf8').trim();
      if (msg && win) {
        win.webContents.send('set-label', msg);
      }
    }
  });

  ipcMain.on('send-cmd', (event, cmd) => {
    // Explicitly write to stdout with a newline and NO extra npm noise
    process.stdout.write(`USER_CMD:${cmd}\n`);
  });
});