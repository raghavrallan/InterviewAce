import { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical, Mic, MicOff, Eye, EyeOff, Ghost, Layers, X, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

const MODE_ICONS = {
  normal: Eye,
  stealth: EyeOff,
  ghost: Ghost,
  adaptive: Layers
};

const MODE_COLORS = {
  normal: 'text-green-400',
  stealth: 'text-yellow-400',
  ghost: 'text-purple-400',
  adaptive: 'text-blue-400'
};

const MODE_LABELS = {
  normal: 'Normal',
  stealth: 'Stealth',
  ghost: 'Ghost',
  adaptive: 'Adaptive'
};

const NAV_ITEMS = [
  { id: 'live', label: 'Live' },
  { id: 'practice', label: 'Practice' },
  { id: 'resume', label: 'Resume' },
  { id: 'settings', label: 'Settings' },
];

function CommandBar() {
  const {
    visibilityMode, setVisibilityMode,
    isRecording, setIsRecording,
    sessionStartTime, setSessionStartTime,
    activeTab, setActiveTab,
    captureMode,
    detectedPlatform, setDetectedPlatform,
    autoStartOnMeeting,
  } = useStore();

  const [elapsed, setElapsed] = useState('00:00');
  const intervalRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // JS-based window drag
  const handleDragMouseDown = useCallback((e) => {
    if (!window.electronAPI) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.screenX, y: e.screenY };
    
    const handleMouseMove = async (moveEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.screenX - dragStartRef.current.x;
      const dy = moveEvent.screenY - dragStartRef.current.y;
      dragStartRef.current = { x: moveEvent.screenX, y: moveEvent.screenY };
      try {
        const pos = await window.electronAPI.getWindowPosition();
        window.electronAPI.setWindowPosition(pos.x + dx, pos.y + dy);
      } catch (_) {}
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Listen for Electron visibility mode changes
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onVisibilityModeChanged(({ mode }) => {
        setVisibilityMode(mode);
      });
      window.electronAPI.getVisibilityMode().then(mode => {
        setVisibilityMode(mode);
      });

      // Listen for meeting detection from main process
      if (window.electronAPI.onMeetingDetected) {
        window.electronAPI.onMeetingDetected((platform) => {
          setDetectedPlatform(platform);
          if (platform && autoStartOnMeeting && !isRecording) {
            // Auto-start transcript when meeting is detected
            setIsRecording(true);
            setSessionStartTime(Date.now());
            toast.success(`Meeting detected: ${platform.name}. Auto-starting transcript.`, { duration: 2000 });
          }
        });
      }

      // Check for existing meeting on mount
      if (window.electronAPI.getCurrentMeeting) {
        window.electronAPI.getCurrentMeeting().then(platform => {
          if (platform) setDetectedPlatform(platform);
        });
      }
    }
  }, [setVisibilityMode, setDetectedPlatform, autoStartOnMeeting, isRecording, setIsRecording, setSessionStartTime]);

  // Session timer
  useEffect(() => {
    if (isRecording && sessionStartTime) {
      intervalRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
        const mins = String(Math.floor(diff / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        setElapsed(`${mins}:${secs}`);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isRecording) setElapsed('00:00');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRecording, sessionStartTime]);

  const handleAudioToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      setSessionStartTime(null);
      toast.success('Stopped', { duration: 1200 });
    } else {
      setIsRecording(true);
      setSessionStartTime(Date.now());
      toast.success('Listening...', { duration: 1200 });
    }
  };

  const handleModeClick = async () => {
    if (window.electronAPI) {
      const newMode = await window.electronAPI.cycleVisibilityMode();
      setVisibilityMode(newMode);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  const ModeIcon = MODE_ICONS[visibilityMode] || Eye;

  return (
    <div className="command-bar">
      {/* Drag Handle + Logo */}
      <div
        className="flex items-center gap-2 select-none"
        onMouseDown={handleDragMouseDown}
        style={{ cursor: 'grab' }}
      >
        <GripVertical className="w-3.5 h-3.5 text-white/20" />
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
          <span className="text-white/50 text-[10px] font-bold tracking-widest">ACE</span>
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-white/10"></div>

      {/* Audio Toggle */}
      <button
        onClick={handleAudioToggle}
        className={`command-bar-btn ${isRecording ? 'command-bar-btn-active' : ''}`}
        title={isRecording ? 'Stop listening' : 'Start listening'}
      >
        {isRecording ? (
          <Mic className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <MicOff className="w-3.5 h-3.5 text-white/40" />
        )}
      </button>

      {/* Enhanced mode indicator */}
      {captureMode === 'dual' && (
        <div className="flex items-center gap-0.5" title="Enhanced dual-stream mode">
          <Monitor className="w-3 h-3 text-cyan-400/70" />
          <Mic className="w-2.5 h-2.5 text-cyan-400/70 -ml-1" />
        </div>
      )}

      {/* Session Timer Pill */}
      <div className={`command-bar-timer ${isRecording ? 'active' : ''}`}>
        {isRecording && <span className="rec-dot-sm"></span>}
        <span>{elapsed}</span>
      </div>

      {/* Meeting Platform Badge */}
      {detectedPlatform && (
        <div className="meeting-badge" title={`In ${detectedPlatform.name}`}>
          <span>{detectedPlatform.name}</span>
        </div>
      )}

      {/* Separator */}
      <div className="w-px h-4 bg-white/10"></div>

      {/* Nav Dots */}
      <div className="flex items-center space-x-1.5">
        {NAV_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="relative group"
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.8 }}
            title={item.label}
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-purple-400 to-blue-400 shadow-[0_0_6px_rgba(139,92,246,0.5)]'
                  : 'bg-white/15 hover:bg-white/30'
              }`}
            />
          </motion.button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-white/10"></div>

      {/* Mode Toggle */}
      <button
        onClick={handleModeClick}
        className={`command-bar-btn ${MODE_COLORS[visibilityMode]}`}
        title={`${MODE_LABELS[visibilityMode]} Mode`}
      >
        <ModeIcon className="w-3.5 h-3.5" />
      </button>

      {/* Close */}
      <button
        onClick={handleClose}
        className="command-bar-btn hover:text-red-400"
        title="Close"
      >
        <X className="w-3.5 h-3.5 text-white/30" />
      </button>
    </div>
  );
}

export default CommandBar;
