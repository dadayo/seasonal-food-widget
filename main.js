const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const SIZES = { s: [248, 160], m: [300, 250], l: [342, 440] };
let win, tray, prefsPath, size = 'm';

function loadPrefs() {
  try {
    prefsPath = path.join(app.getPath('userData'), 'widget-prefs.json');
    const p = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    if (p.size && SIZES[p.size]) size = p.size;
  } catch (e) {}
}
function savePrefs() { try { fs.writeFileSync(prefsPath, JSON.stringify({ size })); } catch (e) {} }

function place() {
  const { workArea } = screen.getPrimaryDisplay();
  const [w, h] = SIZES[size];
  win.setContentSize(w, h);
  win.setPosition(workArea.x + workArea.width - w - 24, workArea.y + 24);
}
function createWindow() {
  const [w, h] = SIZES[size];
  win = new BrowserWindow({
    width: w, height: h, useContentSize: true,
    frame: false, transparent: true, resizable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, fullscreenable: false, maximizable: false,
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
  });
  const { workArea } = screen.getPrimaryDisplay();
  win.setPosition(workArea.x + workArea.width - w - 24, workArea.y + 24);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('index.html');
  win.on('closed', () => { win = null; });
}
function setSize(s) {
  if (!SIZES[s]) return;
  size = s; savePrefs();
  if (win) { place(); win.webContents.send('size', s); }
  buildTray();
}

ipcMain.on('open-recipe', (e, food) => {
  shell.openExternal('https://search.naver.com/search.naver?query=' + encodeURIComponent(food + ' 레시피'));
});
ipcMain.handle('get-size', () => size);

function buildTray() {
  if (!tray) tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('제철 음식 위젯');
  const menu = Menu.buildFromTemplate([
    { label: '위젯 보이기/숨기기', click: () => { if (!win) createWindow(); else win.isVisible() ? win.hide() : win.show(); } },
    { type: 'separator' },
    { label: '크기', submenu: [
      { label: '소형', type: 'radio', checked: size === 's', click: () => setSize('s') },
      { label: '중형', type: 'radio', checked: size === 'm', click: () => setSize('m') },
      { label: '대형', type: 'radio', checked: size === 'l', click: () => setSize('l') },
    ]},
    { type: 'separator' },
    { label: '로그인 시 자동 시작', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (mi) => app.setLoginItemSettings({ openAtLogin: mi.checked }) },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.setTitle(' 제철');
}

app.whenReady().then(() => {
  loadPrefs();
  createWindow();
  buildTray();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => {});
