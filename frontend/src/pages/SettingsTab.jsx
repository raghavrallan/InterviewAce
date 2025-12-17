import { useState, useEffect } from 'react';
import { Settings, Key, Keyboard, Info, Eye, EyeOff, Ghost, Layers, Mic, Headphones, Globe, Video, CheckCircle, XCircle, Briefcase, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { SUPPORTED_LANGUAGES } from '../i18n';
import PlatformDetectionService from '../services/PlatformDetectionService';

function SettingsTab() {
  const { t, i18n } = useTranslation();
  const { visibilityMode, audioInputDevice, audioOutputDevice, setAudioInputDevice, setAudioOutputDevice, selectedCompany, setSelectedCompany, setCompanyTips } = useStore();
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [autoActivateEnabled, setAutoActivateEnabled] = useState(() => {
    return localStorage.getItem('autoActivateOnMeeting') !== 'false';
  });
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

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

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/company/list');
        const data = await response.json();

        if (data.success) {
          setCompanies(data.data.companies);
        } else {
          toast.error('Failed to load companies');
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
        toast.error('Failed to load companies');
      } finally {
        setCompaniesLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleCompanyChange = async (e) => {
    const companyId = e.target.value;

    if (!companyId || companyId === 'none') {
      setSelectedCompany(null);
      setCompanyTips(null);
      localStorage.removeItem('selectedCompany');
      toast.success('Company deselected');
      return;
    }

    try {
      // Fetch company tips
      const response = await fetch(`http://localhost:5000/api/company/${companyId}/tips`);
      const data = await response.json();

      if (data.success) {
        const company = companies.find(c => c.id === companyId);
        setSelectedCompany(company);
        setCompanyTips(data.data);
        localStorage.setItem('selectedCompany', companyId);
        toast.success(`Selected ${company.name} for interview prep`);
      } else {
        toast.error('Failed to load company details');
      }
    } catch (error) {
      console.error('Failed to fetch company tips:', error);
      toast.error('Failed to load company details');
    }
  };

  const toggleAutoActivate = () => {
    const newValue = !autoActivateEnabled;
    setAutoActivateEnabled(newValue);
    localStorage.setItem('autoActivateOnMeeting', String(newValue));

    if (newValue) {
      toast.success('Auto-activation enabled');
      PlatformDetectionService.startMonitoring({ autoActivate: true });
    } else {
      toast.success('Auto-activation disabled');
      PlatformDetectionService.stopMonitoring();
    }
  };

  // Initialize platform detection
  useEffect(() => {
    // Set up callbacks
    PlatformDetectionService.onPlatformDetectedCallback((platform) => {
      setDetectedPlatform(platform);
      toast.success(`${platform.icon} Detected: ${platform.name}`);
    });

    PlatformDetectionService.onMeetingStartCallback(async (platform) => {
      setIsInMeeting(true);
      toast.success(`🎥 Meeting started on ${platform.name}!`);

      // Auto-adjust visibility if Electron API is available
      if (window.electronAPI && window.electronAPI.autoAdjustForPlatform) {
        try {
          await window.electronAPI.autoAdjustForPlatform(platform);
        } catch (error) {
          console.error('Failed to auto-adjust:', error);
        }
      }
    });

    PlatformDetectionService.onMeetingEndCallback((platform) => {
      setIsInMeeting(false);
      if (platform) {
        toast(`Meeting ended on ${platform.name}`);
      }
    });

    // Start monitoring if auto-activate is enabled
    if (autoActivateEnabled) {
      PlatformDetectionService.startMonitoring({ autoActivate: true });
    }

    return () => {
      PlatformDetectionService.stopMonitoring();
    };
  }, [autoActivateEnabled]);

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

      {/* Company-Specific Interview Prep */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Building2 className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Interview Prep Company</h3>
        </div>

        <div className="space-y-3">
          <select
            value={selectedCompany?.id || 'none'}
            onChange={handleCompanyChange}
            disabled={companiesLoading}
            className="w-full glass-input text-sm"
          >
            <option value="none">No company selected</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} - {company.industry}
              </option>
            ))}
          </select>

          {companiesLoading && (
            <div className="text-center py-2">
              <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-white/60 text-xs mt-2">Loading companies...</p>
            </div>
          )}

          {selectedCompany && (
            <div className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Briefcase className="w-5 h-5 text-purple-300" />
                <div>
                  <p className="text-white font-medium text-sm">{selectedCompany.name}</p>
                  <p className="text-white/60 text-xs">{selectedCompany.industry} • {selectedCompany.size}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="p-2 bg-black/20 rounded">
                  <p className="text-blue-300 text-xs font-semibold mb-1">📍 Headquarters:</p>
                  <p className="text-white/70 text-xs">{selectedCompany.headquarters}</p>
                </div>

                <div className="flex items-center space-x-1 p-2 bg-green-500/20 border border-green-400/40 rounded">
                  <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                  <p className="text-green-300 text-xs">
                    Company-specific questions enabled in Practice mode
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-gray-400 text-xs leading-relaxed">
            Select a company to get tailored interview questions, culture tips, and preparation guidance specific to that organization.
          </p>
        </div>
      </div>

      {/* Video Platform Detection */}
      <div className="glass-panel-dark p-3 rounded-xl mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Video className="w-4 h-4 text-purple-300" />
          <h3 className="text-white font-medium text-sm">Video Platform Integration</h3>
        </div>

        <div className="space-y-3">
          {/* Auto-activation toggle */}
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-white/80 text-sm">Auto-Activation</span>
              <Info className="w-3 h-3 text-gray-400" title="Automatically adjust visibility when a meeting is detected" />
            </div>
            <button
              onClick={toggleAutoActivate}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                autoActivateEnabled
                  ? 'bg-green-500/30 text-green-300 border border-green-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
              }`}
            >
              {autoActivateEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Detected platform status */}
          {detectedPlatform ? (
            <div className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{detectedPlatform.icon}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{detectedPlatform.name}</p>
                    <p className="text-white/60 text-xs">Platform detected</p>
                  </div>
                </div>
                {isInMeeting ? (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/30 border border-green-400/50 rounded-full">
                    <CheckCircle className="w-3 h-3 text-green-300" />
                    <span className="text-green-300 text-xs font-semibold">In Meeting</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-500/30 border border-gray-400/50 rounded-full">
                    <XCircle className="w-3 h-3 text-gray-300" />
                    <span className="text-gray-300 text-xs font-semibold">No Meeting</span>
                  </div>
                )}
              </div>

              {/* Platform-specific tips */}
              {detectedPlatform && (
                <div className="mt-2 p-2 bg-black/20 rounded">
                  <p className="text-blue-300 text-xs font-semibold mb-1">💡 Tips for {detectedPlatform.name}:</p>
                  <ul className="text-white/70 text-xs space-y-1">
                    {PlatformDetectionService.getPlatformRecommendations(detectedPlatform.key).tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start space-x-1">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-white/60 text-xs text-center">
                No video platform detected. Open Zoom, Teams, or Meet to enable auto-activation.
              </p>
            </div>
          )}

          {/* Supported platforms */}
          <div className="p-2 bg-white/5 rounded-lg">
            <p className="text-white/70 text-xs font-semibold mb-2">Supported Platforms:</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(PlatformDetectionService.constructor.PLATFORMS).map((platform, idx) => (
                <div key={idx} className="flex items-center space-x-1 px-2 py-1 bg-white/10 rounded-full">
                  <span className="text-xs">{platform.icon}</span>
                  <span className="text-white/70 text-xs">{platform.name}</span>
                </div>
              ))}
            </div>
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
