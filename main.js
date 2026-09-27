const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { startServer } = require('./server/app');

let mainWindow;
let server;

async function createWindow(route = '/') {
  const win = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1180,
    minHeight: 720,
    title: 'EGB Atelier',
    backgroundColor: '#071226',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    createWindow(new URL(url).pathname + new URL(url).search);
    return { action: 'deny' };
  });
  win.on('closed', () => { if (win === mainWindow) mainWindow = null; });
  await win.loadFile(path.join(__dirname, 'src', 'index.html'), { query: { route } });
  return win;
}

app.whenReady().then(async () => {
  const dataDir = path.join(app.getPath('userData'), 'data');
  server = await startServer({ dataDir, port: 0, publicHost: '127.0.0.1' });
  ipcMain.handle('egb:server-info', () => ({ baseUrl: server.baseUrl, dataDir, version: app.getVersion() }));
  ipcMain.handle('egb:open-file', async (_, filePath) => { await shell.openPath(filePath); return true; });
  ipcMain.handle('egb:show-item', async (_, filePath) => { shell.showItemInFolder(filePath); return true; });

  ipcMain.handle('egb:download-file', async (_, {url, token, name}) => {
    const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) throw new Error(`Téléchargement impossible (${r.status})`);
    const downloads = path.join(app.getPath('userData'), 'downloads');
    fs.mkdirSync(downloads, { recursive: true });
    const safe = String(name || 'document').replace(/[^a-zA-Z0-9._ -]/g, '_');
    const target = path.join(downloads, safe);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(target, buf);
    await shell.openPath(target);
    return target;
  });

  ipcMain.handle('egb:choose-file', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    return r.canceled ? [] : r.filePaths;
  });

  mainWindow = await createWindow('/');
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow('/'); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async () => { if (server) await server.close(); });
