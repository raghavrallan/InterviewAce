import { useState, useEffect } from 'react';
import { Eye, EyeOff, Ghost, Layers, Minimize2, X } from 'lucide-react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

const MODE_ICONS = {
  normal: Eye,
  stealth: EyeOff,
  ghost: Ghost,
  adaptive: Layers
};

const MODE_LABELS = {
  normal: 'Normal',
  stealth: 'Stealth',
  ghost: 'Ghost',
  adaptive: 'Adaptive'
};

function Header() {
  const { visibilityMode, setVisibilityMode } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Listen for visibility mode changes from Electron
    if (window.electronAPI) {
      window.electronAPI.onVisibilityModeChanged(({ mode }) => {
        setVisibilityMode(mode);
      });

      // Get initial mode
      window.electronAPI.getVisibilityMode().then(mode => {
        setVisibilityMode(mode);
      });
    }
  }, [setVisibilityMode]);

  const handleModeClick = async () => {
    if (window.electronAPI) {
      const newMode = await window.electronAPI.cycleVisibilityMode();
      setVisibilityMode(newMode);
      toast.success(`Mode: ${MODE_LABELS[newMode]}`, {
        icon: '👁️',
        duration: 2000
      });
    }
  };

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  const ModeIcon = MODE_ICONS[visibilityMode] || Eye;

  return (
    <div className="glass-panel flex items-center justify-between px-3 py-2.5 drag-handle">
      {/* App Title - Draggable */}
      <div className="flex items-center space-x-2 drag-handle">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse"></div>
        <h1 className="text-white text-sm font-semibold tracking-wide">InterviewAce</h1>
      </div>

      <div className="flex items-center space-x-1.5 no-drag">
        {/* Mode Switcher */}
        <button
          onClick={handleModeClick}
          className="glass-button p-2 flex items-center space-x-1.5"
          title={`Current: ${MODE_LABELS[visibilityMode]} (Click to cycle)`}
        >
          <ModeIcon className="w-3.5 h-3.5 text-purple-300" />
          <span className="text-xs text-purple-200">{MODE_LABELS[visibilityMode]}</span>
        </button>

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="glass-button p-2"
          title="Minimize (Ctrl+Shift+H)"
        >
          <Minimize2 className="w-3.5 h-3.5 text-gray-300" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="glass-button p-2 hover:bg-red-500/20"
          title="Close"
        >
          <X className="w-3.5 h-3.5 text-gray-300" />
        </button>
      </div>
    </div>
  );
}

export default Header;
