const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Visibility modes
  cycleVisibilityMode: () => ipcRenderer.invoke('cycle-visibility-mode'),
  setVisibilityMode: (mode) => ipcRenderer.invoke('set-visibility-mode', mode),
  getVisibilityMode: () => ipcRenderer.invoke('get-visibility-mode'),
  onVisibilityModeChanged: (callback) => {
    ipcRenderer.on('visibility-mode-changed', (event, data) => callback(data));
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  setOpacity: (opacity) => ipcRenderer.invoke('set-opacity', opacity),

  // Window position
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', { x, y }),

  // Video platform detection
  getOpenWindows: () => ipcRenderer.invoke('get-open-windows'),
  autoAdjustForPlatform: (platform) => ipcRenderer.invoke('auto-adjust-for-platform', platform),

  // Platform info
  platform: process.platform
});

console.log('⚡ InterviewAce Preload Script Loaded');
