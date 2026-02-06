const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');

// Fix for Windows transparent window rendering
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('enable-transparent-visuals');

const isDev = !app.isPackaged;
let mainWindow;
let visibilityMode = 'normal';
let stealthEnabled = false;

const VISIBILITY_MODES = {
  normal: { opacity: 0.95, alwaysOnTop: true, ignoreMouseEvents: false },
  stealth: { opacity: 0.15, alwaysOnTop: false, ignoreMouseEvents: true },
  ghost: { opacity: 0.05, alwaysOnTop: false, ignoreMouseEvents: true },
  adaptive: { opacity: 0.7, alwaysOnTop: true, ignoreMouseEvents: false }
};

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Start with VISIBLE window, enable stealth features later via shortcut
  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    x: width - 450,
    y: 50,
    frame: false,
    transparent: false,  // Start non-transparent for visibility
    alwaysOnTop: true,
    skipTaskbar: false,  // Show in taskbar initially
    resizable: false,
    movable: true,
    show: true,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
    console.log('Window loaded and shown');
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Enable stealth features (call after window is visible)
function enableStealthFeatures() {
  if (!stealthEnabled && mainWindow) {
    mainWindow.setContentProtection(true);  // Invisible in screen share
    mainWindow.setSkipTaskbar(true);        // Hide from taskbar
    stealthEnabled = true;
    console.log('Stealth features ENABLED');
  }
}

// Disable stealth features
function disableStealthFeatures() {
  if (stealthEnabled && mainWindow) {
    mainWindow.setContentProtection(false);
    mainWindow.setSkipTaskbar(false);
    stealthEnabled = false;
    console.log('Stealth features DISABLED');
  }
}

function setVisibilityMode(mode) {
  if (VISIBILITY_MODES[mode] && mainWindow) {
    visibilityMode = mode;
    const settings = VISIBILITY_MODES[mode];

    mainWindow.setOpacity(settings.opacity);
    mainWindow.setIgnoreMouseEvents(settings.ignoreMouseEvents, { forward: true });
    mainWindow.setAlwaysOnTop(settings.alwaysOnTop);

    // Auto-enable stealth features for stealth/ghost modes
    if (mode === 'stealth' || mode === 'ghost') {
      enableStealthFeatures();
    }

    mainWindow.webContents.send('visibility-mode-changed', { mode, opacity: settings.opacity });
    console.log(`Mode: ${mode.toUpperCase()}`);
  }
}

function cycleVisibilityMode() {
  const modes = ['normal', 'stealth', 'ghost', 'adaptive'];
  const idx = (modes.indexOf(visibilityMode) + 1) % modes.length;
  setVisibilityMode(modes[idx]);
  return modes[idx];
}

function registerShortcuts() {
  globalShortcut.unregisterAll();

  // Ctrl+Shift+V: Cycle modes
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow) cycleVisibilityMode();
  });

  // Ctrl+Shift+S: Stealth mode
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) setVisibilityMode('stealth');
  });

  // Ctrl+Shift+G: Ghost mode
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    if (mainWindow) setVisibilityMode('ghost');
  });

  // Ctrl+Shift+N: Normal mode
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (mainWindow) {
      setVisibilityMode('normal');
      disableStealthFeatures();  // Show in taskbar again
    }
  });

  // Ctrl+Shift+H: Hide/Show
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        setVisibilityMode('normal');
      }
    }
  });

  // Ctrl+Shift+A: Focus & Normal
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      setVisibilityMode('normal');
    }
  });

  // Ctrl+Shift+X: Toggle stealth features
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    if (stealthEnabled) {
      disableStealthFeatures();
    } else {
      enableStealthFeatures();
    }
  });

  console.log('Shortcuts registered');
}

app.whenReady().then(() => {
  // Small delay to ensure GPU is ready
  setTimeout(() => {
    createWindow();
    registerShortcuts();
  }, 100);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('cycle-visibility-mode', () => cycleVisibilityMode());
ipcMain.handle('set-visibility-mode', (e, mode) => { setVisibilityMode(mode); return mode; });
ipcMain.handle('get-visibility-mode', () => visibilityMode);
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => app.quit());
ipcMain.handle('set-opacity', (e, opacity) => mainWindow?.setOpacity(opacity));
ipcMain.handle('get-window-position', () => {
  const p = mainWindow?.getPosition();
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
});
ipcMain.handle('set-window-position', (e, { x, y }) => mainWindow?.setPosition(x, y));
ipcMain.handle('get-open-windows', () => []);
ipcMain.handle('auto-adjust-for-platform', (e, platform) => {
  setVisibilityMode(platform.key === 'ZOOM' || platform.key === 'TEAMS' ? 'ghost' : 'stealth');
  return { success: true, mode: visibilityMode };
});
ipcMain.handle('enable-stealth', () => { enableStealthFeatures(); return true; });
ipcMain.handle('disable-stealth', () => { disableStealthFeatures(); return true; });

console.log('========================================');
console.log('InterviewAce Started');
console.log('========================================');
console.log('Window will appear at RIGHT side of screen');
console.log('');
console.log('SHORTCUTS:');
console.log('  Ctrl+Shift+N  = Normal (visible)');
console.log('  Ctrl+Shift+S  = Stealth mode');
console.log('  Ctrl+Shift+G  = Ghost mode');
console.log('  Ctrl+Shift+X  = Toggle stealth features');
console.log('  Ctrl+Shift+A  = Focus window');
console.log('========================================');
