const { app, BrowserWindow, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');

let win, tray;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const W = 248, H = 156;
  win = new BrowserWindow({
    width: W, height: H,
    x: workArea.x + workArea.width - W - 24,
    y: workArea.y + 24,
    frame: false, transparent: true, resizable: false,
    hasShadow: false, alwaysOnTop: true, skipTaskbar: true,
    fullscreenable: false, maximizable: false,
    webPreferences: { contextIsolation: true }
  });
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('index.html');
  win.on('closed', () => { win = null; });
}

function createTray() {
  // simple emoji-ish tray via template image fallback (text title)
  const img = nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip('제철 음식 위젯');
  const menu = Menu.buildFromTemplate([
    { label: '위젯 보이기/숨기기', click: () => { if (!win) createWindow(); else win.isVisible() ? win.hide() : win.show(); } },
    { type: 'separator' },
    { label: '로그인 시 자동 시작', type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (mi) => app.setLoginItemSettings({ openAtLogin: mi.checked }) },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
  tray.setTitle('🍎');
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { /* keep running in tray */ });
