const { app, BrowserWindow, ipcMain, globalShortcut, screen, session, desktopCapturer } = require('electron');
const path = require('path');
const { execSync } = require('child_process');

// Suppress EPIPE errors globally - these occur on Windows when stdout pipe is broken
// (harmless, but Electron shows a crash dialog for uncaught exceptions)
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.message?.includes('EPIPE')) {
    // Silently ignore broken pipe errors
    return;
  }
  // For other errors, log to stderr (less likely to EPIPE) but don't show dialog
  try { process.stderr.write(`[Main] Uncaught: ${err.message}\n`); } catch (_) {}
});

// Fix for Windows transparent window rendering
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('enable-transparent-visuals');

const isDev = !app.isPackaged;
let mainWindow;
let visibilityMode = 'normal';
let stealthEnabled = false;

// Safe logger that won't crash on broken pipe
function log(msg) {
  try { process.stdout.write(msg + '\n'); } catch (_) {}
}
function logError(msg) {
  try { process.stderr.write(msg + '\n'); } catch (_) {}
}

const VISIBILITY_MODES = {
  normal: { opacity: 0.95, alwaysOnTop: true, ignoreMouseEvents: false },
  stealth: { opacity: 0.15, alwaysOnTop: false, ignoreMouseEvents: true },
  ghost: { opacity: 0.05, alwaysOnTop: false, ignoreMouseEvents: true },
  adaptive: { opacity: 0.7, alwaysOnTop: true, ignoreMouseEvents: false }
};

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Floating widget window - transparent background, pill-shaped content
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: width - 430,
    y: 50,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = isDev
    ? (process.env.ELECTRON_START_URL || 'http://localhost:5173')
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();

    // Enable stealth features by default (invisible in screen share, hidden from taskbar)
    setTimeout(() => {
      enableStealthFeatures();
    }, 500);

    log('Window loaded and shown');

    // Start meeting detection after window loads
    startMeetingDetection();
  });

  // DevTools disabled by default - use Ctrl+Shift+I to open manually if needed
  // if (isDev) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }

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
    log('Stealth features ENABLED');
  }
}

// Disable stealth features
function disableStealthFeatures() {
  if (stealthEnabled && mainWindow) {
    mainWindow.setContentProtection(false);
    mainWindow.setSkipTaskbar(false);
    stealthEnabled = false;
    log('Stealth features DISABLED');
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
    log(`Mode: ${mode.toUpperCase()}`);
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

  log('Shortcuts registered');
}

app.whenReady().then(() => {
  // Grant media permissions automatically (microphone, screen, display capture)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'audioCapture', 'microphone', 'screen', 'display-capture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      log(`Permission granted: ${permission}`);
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'audioCapture', 'microphone', 'screen', 'display-capture', 'mediaKeySystem'];
    return allowedPermissions.includes(permission);
  });

  // Auto-handle getDisplayMedia requests for system audio capture (Enhanced mode)
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      if (sources.length > 0) {
        log('Display media: auto-selecting primary screen for system audio');
        callback({ video: sources[0], audio: 'loopback' });
      } else {
        callback({});
      }
    }).catch(() => {
      callback({});
    });
  });

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
ipcMain.handle('get-open-windows', () => {
  try {
    // Use PowerShell to enumerate windows with titles (no native deps needed)
    const psCmd = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json`;
    const raw = execSync(`powershell -NoProfile -Command "${psCmd}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
    });
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.map(p => ({
      title: p.MainWindowTitle || '',
      path: p.ProcessName || '',
      processId: p.Id || 0,
    })).filter(w => w.title);
  } catch (err) {
    logError('Window enumeration failed: ' + err.message);
    return [];
  }
});
ipcMain.handle('auto-adjust-for-platform', (e, platform) => {
  setVisibilityMode(platform.key === 'ZOOM' || platform.key === 'TEAMS' ? 'ghost' : 'stealth');
  return { success: true, mode: visibilityMode };
});
ipcMain.handle('enable-stealth', () => { enableStealthFeatures(); return true; });
ipcMain.handle('disable-stealth', () => { disableStealthFeatures(); return true; });

// Periodic meeting platform detection (every 5 seconds)
const MEETING_PATTERNS = {
  ZOOM: /zoom\s*(meeting|workplace|video)?/i,
  TEAMS: /microsoft\s*teams|teams\s*(meeting|call)/i,
  MEET: /google\s*meet|meet\.google/i,
  WEBEX: /webex|cisco\s*webex/i,
  SKYPE: /skype/i,
};

let currentMeetingPlatform = null;
let meetingCheckInterval = null;

function detectMeetingPlatform() {
  try {
    const psCmd = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object MainWindowTitle | ConvertTo-Json`;
    const raw = execSync(`powershell -NoProfile -Command "${psCmd}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
    });
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    for (const w of list) {
      const title = w.MainWindowTitle || '';
      if (!title) continue;

      for (const [key, pattern] of Object.entries(MEETING_PATTERNS)) {
        if (pattern.test(title)) {
          return { key, title, name: key.charAt(0) + key.slice(1).toLowerCase() };
        }
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

function startMeetingDetection() {
  meetingCheckInterval = setInterval(() => {
    const platform = detectMeetingPlatform();
    const changed = (platform?.key || null) !== (currentMeetingPlatform?.key || null);

    if (changed) {
      currentMeetingPlatform = platform;
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('meeting-detected', platform);
      }
      if (platform) {
        log(`Meeting detected: ${platform.name} (${platform.title})`);
      } else {
        log('Meeting ended');
      }
    }
  }, 5000);
}

ipcMain.handle('get-current-meeting', () => currentMeetingPlatform);

log('========================================');
log('InterviewAce Started');
log('========================================');
log('Window will appear at RIGHT side of screen');
log('');
log('SHORTCUTS:');
log('  Ctrl+Shift+N  = Normal (visible)');
log('  Ctrl+Shift+S  = Stealth mode');
log('  Ctrl+Shift+G  = Ghost mode');
log('  Ctrl+Shift+X  = Toggle stealth features');
log('  Ctrl+Shift+A  = Focus window');
log('========================================');
