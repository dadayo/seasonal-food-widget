const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  openRecipe: (food) => ipcRenderer.send('open-recipe', food),
  getSize: () => ipcRenderer.invoke('get-size'),
  onSize: (cb) => ipcRenderer.on('size', (_e, s) => cb(s)),
});
