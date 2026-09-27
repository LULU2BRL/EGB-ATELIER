const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('egbDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '5.0.0',
  serverInfo: () => ipcRenderer.invoke('egb:server-info'),
  openFile: (filePath) => ipcRenderer.invoke('egb:open-file', filePath),
  showItem: (filePath) => ipcRenderer.invoke('egb:show-item', filePath),
  chooseFile: () => ipcRenderer.invoke('egb:choose-file'),
  downloadFile: (args) => ipcRenderer.invoke('egb:download-file', args)
});
