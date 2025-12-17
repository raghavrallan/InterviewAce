import { useState, useEffect } from 'react';
import { Settings, Key, Keyboard, Info, Eye, EyeOff, Ghost, Layers, Mic, Headphones, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { SUPPORTED_LANGUAGES } from '../i18n';

function SettingsTab() {
  const { t, i18n } = useTranslation();
  const { visibilityMode, audioInputDevice, audioOutputDevice, setAudioInputDevice, setAudioOutputDevice } = useStore();
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Enumerate audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const inputs = devices.filter(device => device.kind === 'audioinput');
        const outputs = devices.filter(device => device.kind === 'audiooutput');

        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);

        console.log('Audio devices found:', { inputs: inputs.length, outputs: outputs.length });
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
        toast.error('Failed to load audio devices');
      }
    };

    getDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  const handleInputDeviceChange = (e) => {
    const deviceId = e.target.value === 'default' ? null : e.target.value;
    setAudioInputDevice(deviceId);
    toast.success('Input device updated');
  };

  const handleOutputDeviceChange = (e) => {
    const deviceId = e.target.value === 'default' ? null : e.target.value;
    setAudioOutputDevice(deviceId);
    toast.success('Output device updated');
  };

  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    await i18n.changeLanguage(newLanguage);
    setCurrentLanguage(newLanguage);
    toast.success(`Language changed to ${SUPPORTED_LANGUAGES.find(l => l.code === newLanguage)?.name || 'English'}`);
  };

  const shortcuts = [
    { keys: 'Ctrl+Shift+V', description: 'Cycle Visibility Modes', icon: Layers },
    { keys: 'Ctrl+Shift+S', description: 'Quick Stealth Mode', icon: EyeOff },
    { keys: 'Ctrl+Shift+G', description: 'Ghost Mode (Nearly Invisible)', icon: Ghost },
    { keys: 'Ctrl+Shift+N', description: 'Normal Mode', icon: Eye },
    { keys: 'Ctrl+Shift+H', description: 'Hide/Show Window', icon: Eye },
    { keys: 'Ctrl+Shift+A', description: 'Focus & Normal Mode', icon: Eye },
  ];

  const modes = [
    {
      name: 'Normal',
      icon: Eye,
      opacity: '95%',
      description: 'Full visibility, always on top',
      color: 'text-green-400'
    },
    {
      name: 'Stealth',
      icon: EyeOff,
      opacity: '15%',
      description: 'Low visibility, click-through',
      color: 'text-yellow-400'
    },
    {
      name: 'Ghost',
      icon: Ghost,
      opacity: '5%',
      description: 'Nearly invisible, perfect for screen sharing',
      color: 'text-purple-400'
    },
    {
      name: 'Adaptive',
      icon: Layers,
      opacity: '70%',
      description: 'Blends with screen, interactive',
      color: 'text-blue-400'
    }
  ];

  return (
    <div className="glass-panel h-full overflow-y-auto custom-scrollbar p-3">
      <h2 className="text-white font-semibold text-base mb-4">Settings</h2>

      {/* Language Selection */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Globe className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Language / Idioma / 语言</h3>
        </div>

        <div className="space-y-3">
          <select
            value={currentLanguage}
            onChange={handleLanguageChange}
            className="w-full glass-input text-sm"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>

          <p className="text-gray-400 text-xs leading-relaxed">
            Select your preferred language for the interface and speech recognition.
            Changes will apply immediately to the UI and voice input.
          </p>

          <div className="flex items-center space-x-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <p className="text-blue-300 text-xs">
              Speech recognition accuracy may vary by language and requires internet connection.
            </p>
          </div>
        </div>
      </div>

      {/* Audio Devices Section */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Headphones className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Audio Devices</h3>
        </div>

        <div className="space-y-3">
          {/* Input Device */}
          <div>
            <label className="flex items-center space-x-2 text-gray-300 text-xs mb-2">
              <Mic className="w-3 h-3" />
              <span>Microphone (Input)</span>
            </label>
            <select
              value={audioInputDevice || 'default'}
              onChange={handleInputDeviceChange}
              className="w-full glass-input text-xs"
            >
              <option value="default">Default Microphone</option>
              {audioInputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Output Device */}
          <div>
            <label className="flex items-center space-x-2 text-gray-300 text-xs mb-2">
              <Headphones className="w-3 h-3" />
              <span>Speaker (Output)</span>
            </label>
            <select
              value={audioOutputDevice || 'default'}
              onChange={handleOutputDeviceChange}
              className="w-full glass-input text-xs"
            >
              <option value="default">Default Speaker</option>
              {audioOutputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <p className="text-gray-500 text-xs mt-2">
            {audioInputDevices.length} input device(s) and {audioOutputDevices.length} output device(s) available
          </p>
        </div>
      </div>

      {/* Status Section */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Info className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Current Status</h3>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-xs">Visibility Mode</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                visibilityMode === 'normal'
                  ? 'bg-green-500/20 text-green-300'
                  : visibilityMode === 'stealth'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : visibilityMode === 'ghost'
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-blue-500/20 text-blue-300'
              }`}
            >
              {visibilityMode.toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-xs">Backend</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">
              Connected
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-xs">Speech Recognition</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
              Web Speech API
            </span>
          </div>
        </div>
      </div>

      {/* Visibility Modes */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Layers className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Visibility Modes</h3>
        </div>

        <div className="space-y-2">
          {modes.map((mode, index) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`w-5 h-5 ${mode.color} mt-0.5`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-medium text-xs">{mode.name}</span>
                      <span className="text-gray-400 text-xs">{mode.opacity}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{mode.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Keyboard className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Keyboard Shortcuts</h3>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => {
            const Icon = shortcut.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex justify-between items-center p-2 bg-white/5 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-3.5 h-3.5 text-purple-300" />
                  <span className="text-gray-300 text-xs">{shortcut.description}</span>
                </div>
                <kbd className="px-2 py-1 bg-white/10 rounded text-purple-200 text-xs font-mono">
                  {shortcut.keys}
                </kbd>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* About */}
      <div className="glass-panel-dark p-3 rounded-xl">
        <h3 className="text-white font-medium text-sm mb-2">About InterviewAce</h3>
        <p className="text-gray-400 text-xs leading-relaxed mb-3">
          AI-powered interview assistant with advanced stealth modes for discreet assistance during interviews.
        </p>

        <div className="space-y-1 text-xs text-gray-500">
          <p>Version 2.0.0</p>
          <p>Powered by Azure OpenAI (GPT-4o-mini) & Web Speech API</p>
          <p className="mt-3 pt-3 border-t border-white/10 text-gray-400">
            <strong>Features:</strong> Real-time transcription, AI answers, Resume analysis, 4 visibility modes
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
