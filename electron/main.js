const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');

// Simple dev check instead of electron-is-dev
const isDev = !app.isPackaged;

let mainWindow;
let visibilityMode = 'normal'; // normal, stealth, ghost, adaptive

const VISIBILITY_MODES = {
  normal: { opacity: 0.95, alwaysOnTop: true, ignoreMouseEvents: false },
  stealth: { opacity: 0.15, alwaysOnTop: false, ignoreMouseEvents: true },
  ghost: { opacity: 0.05, alwaysOnTop: false, ignoreMouseEvents: true },
  adaptive: { opacity: 0.7, alwaysOnTop: true, ignoreMouseEvents: false }
};

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    x: Math.floor((width - 420) / 2), // Center horizontally
    y: Math.floor((height - 680) / 2), // Center vertically
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true, // Hide from taskbar and Alt+Tab
    resizable: false,
    movable: true,
    opacity: 0.95, // More translucent
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable audio loopback for system audio capture
      enableAudioLoopback: true
    }
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Prevent external links from opening
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Open DevTools in development (optional - comment out if not needed)
  // if (isDev) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }

  // Prevent window from being captured in screen share (experimental)
  mainWindow.setContentProtection(true);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Cycle through visibility modes
function cycleVisibilityMode() {
  const modes = ['normal', 'stealth', 'ghost', 'adaptive'];
  const currentIndex = modes.indexOf(visibilityMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  visibilityMode = modes[nextIndex];

  applyVisibilityMode(visibilityMode);
  return visibilityMode;
}

// Set specific visibility mode
function setVisibilityMode(mode) {
  if (VISIBILITY_MODES[mode]) {
    visibilityMode = mode;
    applyVisibilityMode(mode);
  }
}

// Apply visibility mode settings
function applyVisibilityMode(mode) {
  const settings = VISIBILITY_MODES[mode];

  mainWindow.setOpacity(settings.opacity);
  mainWindow.setIgnoreMouseEvents(settings.ignoreMouseEvents, { forward: true });
  mainWindow.setAlwaysOnTop(settings.alwaysOnTop);

  // Adaptive mode: blend with screen
  if (mode === 'adaptive') {
    mainWindow.setBackgroundColor('#00000000');
  }

  // Ghost mode: nearly invisible
  if (mode === 'ghost') {
    mainWindow.setSkipTaskbar(true);
  } else {
    mainWindow.setSkipTaskbar(false);
  }

  // Send mode to renderer
  mainWindow.webContents.send('visibility-mode-changed', {
    mode,
    opacity: settings.opacity
  });

  console.log(`Visibility Mode: ${mode.toUpperCase()}`);
}

// Register global shortcuts
function registerShortcuts() {
  // Cycle visibility modes: Ctrl+Shift+V
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    const newMode = cycleVisibilityMode();
    console.log(`Switched to: ${newMode.toUpperCase()} mode`);
  });

  // Quick stealth: Ctrl+Shift+S
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    setVisibilityMode('stealth');
  });

  // Ghost mode: Ctrl+Shift+G
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    setVisibilityMode('ghost');
  });

  // Normal mode: Ctrl+Shift+N
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    setVisibilityMode('normal');
  });

  // Toggle window visibility: Ctrl+Shift+H
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      setVisibilityMode('normal');
    }
  });

  // Focus window: Ctrl+Shift+A
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    mainWindow.show();
    mainWindow.focus();
    setVisibilityMode('normal');
  });
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('cycle-visibility-mode', () => {
  return cycleVisibilityMode();
});

ipcMain.handle('set-visibility-mode', (event, mode) => {
  setVisibilityMode(mode);
  return mode;
});

ipcMain.handle('get-visibility-mode', () => {
  return visibilityMode;
});

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
  app.quit();
});

ipcMain.handle('set-opacity', (event, opacity) => {
  mainWindow.setOpacity(opacity);
});

// Window position management
ipcMain.handle('get-window-position', () => {
  const position = mainWindow.getPosition();
  return { x: position[0], y: position[1] };
});

ipcMain.handle('set-window-position', (event, { x, y }) => {
  mainWindow.setPosition(x, y);
});

// Get list of open windows (for platform detection)
ipcMain.handle('get-open-windows', async () => {
  try {
    // Get all windows using Electron's BrowserWindow.getAllWindows()
    // Note: This only gets Electron windows, not system windows
    // For system-wide window detection, we'd need additional native modules

    const windows = [];

    // Check page title (for web-based platforms)
    if (mainWindow && mainWindow.webContents) {
      const title = mainWindow.getTitle();
      const url = mainWindow.webContents.getURL();

      windows.push({
        title,
        url,
        id: mainWindow.id
      });
    }

    return windows;
  } catch (error) {
    console.error('Failed to get open windows:', error);
    return [];
  }
});

// Auto-detect video platform and adjust visibility
ipcMain.handle('auto-adjust-for-platform', (event, platform) => {
  console.log(`🎯 Auto-adjusting for ${platform.name}`);

  // Automatically switch to ghost/stealth mode when platform detected
  if (platform.key === 'ZOOM' || platform.key === 'TEAMS') {
    setVisibilityMode('ghost');
  } else {
    setVisibilityMode('stealth');
  }

  return { success: true, mode: visibilityMode };
});

console.log('🚀 InterviewAce Electron App Started');
console.log('📌 Shortcuts:');
console.log('   Ctrl+Shift+V: Cycle Modes (Normal→Stealth→Ghost→Adaptive)');
console.log('   Ctrl+Shift+S: Quick Stealth');
console.log('   Ctrl+Shift+G: Ghost Mode (Almost Invisible)');
console.log('   Ctrl+Shift+N: Normal Mode');
console.log('   Ctrl+Shift+H: Hide/Show Window');
console.log('   Ctrl+Shift+A: Focus & Normal Mode');
