import { useState, useEffect } from 'react';
import {
  Globe, Video, Mic, Headphones, Info, Eye, EyeOff, Ghost, Layers,
  Keyboard, Building2, Briefcase, CheckCircle, XCircle, ChevronDown,
  Volume2, Zap, Monitor, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { SUPPORTED_LANGUAGES } from '../i18n';
import PlatformDetectionService from '../services/PlatformDetectionService';
import SpeechService from '../services/SpeechService';

function AccordionSection({ title, icon: Icon, iconColor = 'text-purple-300', children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-panel-dark rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="collapsible-header w-full"
      >
        <div className="flex items-center space-x-2">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className="text-white text-xs font-medium">{title}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 collapsible-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsTab() {
  const { t, i18n } = useTranslation();
  const {
    visibilityMode, audioInputDevice, audioOutputDevice, setAudioInputDevice, setAudioOutputDevice,
    selectedCompany, setSelectedCompany, setCompanyTips,
    sttProvider, setSttProvider,
    captureMode, setCaptureMode,
    speakerMap, setSpeakerMap,
    autoStartOnMeeting, setAutoStartOnMeeting,
    ttsEnabled, setTtsEnabled, ttsVoice, setTtsVoice, ttsRate, setTtsRate
  } = useStore();
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
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
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // Load TTS voices
  useEffect(() => {
    if (SpeechService.isSupported()) {
      const voices = SpeechService.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
      SpeechService.onVoicesLoaded((v) => setAvailableVoices(v));
    }
  }, []);

  const handleInputDeviceChange = (e) => {
    setAudioInputDevice(e.target.value === 'default' ? null : e.target.value);
    toast.success('Input updated');
  };

  const handleOutputDeviceChange = (e) => {
    setAudioOutputDevice(e.target.value === 'default' ? null : e.target.value);
    toast.success('Output updated');
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    await i18n.changeLanguage(newLang);
    setCurrentLanguage(newLang);
    toast.success(`Language: ${SUPPORTED_LANGUAGES.find(l => l.code === newLang)?.name || newLang}`);
  };

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/company/list');
        const data = await response.json();
        if (data.success) setCompanies(data.data.companies);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
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
      const response = await fetch(`http://localhost:5000/api/company/${companyId}/tips`);
      const data = await response.json();

      if (data.success) {
        const company = companies.find(c => c.id === companyId);
        setSelectedCompany(company);
        setCompanyTips(data.data);
        localStorage.setItem('selectedCompany', companyId);
        toast.success(`Selected ${company.name}`);
      } else {
        toast.error('Failed to load company');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection error');
    }
  };

  const toggleAutoActivate = () => {
    const newValue = !autoActivateEnabled;
    setAutoActivateEnabled(newValue);
    localStorage.setItem('autoActivateOnMeeting', String(newValue));

    if (newValue) {
      PlatformDetectionService.startMonitoring({ autoActivate: true });
    } else {
      PlatformDetectionService.stopMonitoring();
    }
    toast.success(newValue ? 'Auto-activation on' : 'Auto-activation off');
  };

  // Platform detection
  useEffect(() => {
    PlatformDetectionService.onPlatformDetectedCallback((platform) => {
      setDetectedPlatform(platform);
    });

    PlatformDetectionService.onMeetingStartCallback(async (platform) => {
      setIsInMeeting(true);
      if (window.electronAPI && window.electronAPI.autoAdjustForPlatform) {
        try {
          await window.electronAPI.autoAdjustForPlatform(platform);
        } catch (error) {
          console.error('Failed to auto-adjust:', error);
        }
      }
    });

    PlatformDetectionService.onMeetingEndCallback(() => {
      setIsInMeeting(false);
    });

    if (autoActivateEnabled) {
      PlatformDetectionService.startMonitoring({ autoActivate: true });
    }

    return () => PlatformDetectionService.stopMonitoring();
  }, [autoActivateEnabled]);

  const shortcuts = [
    { keys: 'Ctrl+Shift+V', desc: 'Cycle Modes' },
    { keys: 'Ctrl+Shift+S', desc: 'Stealth' },
    { keys: 'Ctrl+Shift+G', desc: 'Ghost' },
    { keys: 'Ctrl+Shift+N', desc: 'Normal' },
    { keys: 'Ctrl+Shift+H', desc: 'Hide/Show' },
    { keys: 'Ctrl+Shift+A', desc: 'Focus' },
  ];

  const modes = [
    { name: 'Normal', icon: Eye, opacity: '95%', color: 'text-green-400' },
    { name: 'Stealth', icon: EyeOff, opacity: '15%', color: 'text-yellow-400' },
    { name: 'Ghost', icon: Ghost, opacity: '5%', color: 'text-purple-400' },
    { name: 'Adaptive', icon: Layers, opacity: '70%', color: 'text-blue-400' },
  ];

  return (
    <div className="h-full flex flex-col p-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5">
        <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-2 space-y-2">
        {/* Language */}
        <AccordionSection title="Language" icon={Globe} defaultOpen={false}>
          <select
            value={currentLanguage}
            onChange={handleLanguageChange}
            className="w-full input-sm bg-white/[0.03]"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          <p className="text-white/25 text-[10px] mt-1.5">
            UI and speech recognition language
          </p>
        </AccordionSection>

        {/* Company Prep */}
        <AccordionSection title="Company Prep" icon={Building2} defaultOpen={false}>
          <select
            value={selectedCompany?.id || 'none'}
            onChange={handleCompanyChange}
            disabled={companiesLoading}
            className="w-full input-sm bg-white/[0.03]"
          >
            <option value="none">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {selectedCompany && (
            <div className="mt-2 p-2 bg-purple-500/5 border border-purple-400/10 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Briefcase className="w-3 h-3 text-purple-300/60" />
                <span className="text-white text-[11px] font-medium">{selectedCompany.name}</span>
              </div>
              <p className="text-white/30 text-[10px]">{selectedCompany.industry} - {selectedCompany.size}</p>
              <div className="flex items-center space-x-1 mt-1.5">
                <CheckCircle className="w-2.5 h-2.5 text-green-300/60" />
                <p className="text-green-300/60 text-[10px]">Company questions enabled</p>
              </div>
            </div>
          )}
        </AccordionSection>

        {/* Video Platform */}
        <AccordionSection title="Video Platform" icon={Video} defaultOpen={false}>
          <div className="space-y-2">
            {/* Auto-activation */}
            <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
              <span className="text-white/60 text-[11px]">Auto-Activation</span>
              <button
                onClick={toggleAutoActivate}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  autoActivateEnabled
                    ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {autoActivateEnabled ? 'On' : 'Off'}
              </button>
            </div>

            {/* Platform status */}
            {detectedPlatform ? (
              <div className="p-2 bg-blue-500/5 border border-blue-400/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm">{detectedPlatform.icon}</span>
                    <span className="text-white text-[11px] font-medium">{detectedPlatform.name}</span>
                  </div>
                  {isInMeeting ? (
                    <span className="flex items-center space-x-0.5 text-green-300 text-[10px]">
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>In Meeting</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-0.5 text-white/30 text-[10px]">
                      <XCircle className="w-2.5 h-2.5" />
                      <span>Idle</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-white/25 text-[10px] text-center py-1">
                No platform detected
              </p>
            )}

            {/* Supported */}
            <div className="flex flex-wrap gap-1">
              {Object.values(PlatformDetectionService.constructor.PLATFORMS).map((p, i) => (
                <span key={i} className="flex items-center space-x-0.5 px-1.5 py-0.5 bg-white/[0.03] rounded text-[10px] text-white/30">
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* Audio Devices */}
        <AccordionSection title="Audio Devices" icon={Headphones} defaultOpen={false}>
          <div className="space-y-2">
            <div>
              <label className="flex items-center space-x-1.5 text-white/40 text-[10px] mb-1">
                <Mic className="w-2.5 h-2.5" />
                <span>Input</span>
              </label>
              <select
                value={audioInputDevice || 'default'}
                onChange={handleInputDeviceChange}
                className="w-full input-sm bg-white/[0.03]"
              >
                <option value="default">Default Microphone</option>
                {audioInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-1.5 text-white/40 text-[10px] mb-1">
                <Headphones className="w-2.5 h-2.5" />
                <span>Output</span>
              </label>
              <select
                value={audioOutputDevice || 'default'}
                onChange={handleOutputDeviceChange}
                className="w-full input-sm bg-white/[0.03]"
              >
                <option value="default">Default Speaker</option>
                {audioOutputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Speaker ${d.deviceId.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-white/20 text-[10px]">
              {audioInputDevices.length} in / {audioOutputDevices.length} out detected
            </p>
          </div>
        </AccordionSection>

        {/* STT Provider */}
        <AccordionSection title="Speech Recognition" icon={Zap} iconColor="text-blue-300" defaultOpen={false}>
          <div className="space-y-2">
            <div className="space-y-1.5">
              {[
                { id: 'deepgram', label: 'Deepgram (Real-time)', desc: 'WebSocket streaming, ~250ms latency', badge: 'Free tier' },
                { id: 'whisper', label: 'Whisper API (Chunks)', desc: '3s chunks, requires OpenAI/Azure key', badge: 'Fallback' },
              ].map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSttProvider(provider.id);
                    toast.success(`STT: ${provider.label}`);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                    sttProvider === provider.id
                      ? 'bg-blue-500/10 border border-blue-400/20'
                      : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <p className={`text-[11px] font-medium ${sttProvider === provider.id ? 'text-white' : 'text-white/60'}`}>
                      {provider.label}
                    </p>
                    <p className="text-white/25 text-[10px]">{provider.desc}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    sttProvider === provider.id ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-white/30'
                  }`}>
                    {provider.badge}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-white/20 text-[10px]">
              Deepgram needs DEEPGRAM_API_KEY in backend .env (free at deepgram.com)
            </p>
          </div>
        </AccordionSection>

        {/* Audio Capture Mode */}
        <AccordionSection title="Audio Capture Mode" icon={Monitor} iconColor="text-cyan-300" defaultOpen={false}>
          <div className="space-y-2">
            <div className="space-y-1.5">
              {[
                { id: 'dual', label: 'Enhanced (Separate System Audio)', desc: 'Recommended when using headphones. Captures interviewer audio from system separately.', badge: 'Recommended' },
                { id: 'diarization', label: 'Standard (AI Speaker Detection)', desc: 'Fallback: single mic stream. Only works if interviewer audio plays through speakers (not headphones).', badge: 'Fallback' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setCaptureMode(mode.id);
                    toast.success(`Capture mode: ${mode.label}`);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                    captureMode === mode.id
                      ? 'bg-cyan-500/10 border border-cyan-400/20'
                      : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <p className={`text-[11px] font-medium ${captureMode === mode.id ? 'text-white' : 'text-white/60'}`}>
                      {mode.label}
                    </p>
                    <p className="text-white/25 text-[10px]">{mode.desc}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    captureMode === mode.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/30'
                  }`}>
                    {mode.badge}
                  </span>
                </button>
              ))}
            </div>
            {captureMode === 'dual' && (
              <p className="text-cyan-300/60 text-[10px] p-2 bg-cyan-500/5 border border-cyan-400/10 rounded-lg">
                Captures your mic (Me) and system audio (Interviewer) on separate channels. Screen share permission is auto-granted in the desktop app.
              </p>
            )}
            {captureMode === 'diarization' && (
              <p className="text-yellow-300/60 text-[10px] p-2 bg-yellow-500/5 border border-yellow-400/10 rounded-lg">
                Only captures your microphone. If you use headphones, the interviewer's voice will NOT be transcribed. Switch to Enhanced mode for headphone use.
              </p>
            )}
          </div>
        </AccordionSection>

        {/* Speaker Labels */}
        <AccordionSection title="Speaker Labels" icon={Users} iconColor="text-green-300" defaultOpen={false}>
          <div className="space-y-2">
            <div>
              <label className="text-white/40 text-[10px] mb-1 block">Speaker 0 (Interviewer)</label>
              <input
                type="text"
                value={speakerMap[0] || ''}
                onChange={(e) => setSpeakerMap({ ...speakerMap, 0: e.target.value })}
                className="w-full input-sm bg-white/[0.03]"
                placeholder="Interviewer"
              />
            </div>
            <div>
              <label className="text-white/40 text-[10px] mb-1 block">Speaker 1 (Me)</label>
              <input
                type="text"
                value={speakerMap[1] || ''}
                onChange={(e) => setSpeakerMap({ ...speakerMap, 1: e.target.value })}
                className="w-full input-sm bg-white/[0.03]"
                placeholder="Me"
              />
            </div>
            <p className="text-white/20 text-[10px]">
              Customize how speakers are labeled in the transcript
            </p>

            {/* Auto-start on meeting toggle */}
            <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg mt-2">
              <span className="text-white/60 text-[11px]">Auto-start on meeting</span>
              <button
                onClick={() => {
                  setAutoStartOnMeeting(!autoStartOnMeeting);
                  toast.success(autoStartOnMeeting ? 'Auto-start off' : 'Auto-start on');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  autoStartOnMeeting
                    ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {autoStartOnMeeting ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </AccordionSection>

        {/* TTS / Speech Output */}
        <AccordionSection title="Speech Output" icon={Volume2} iconColor="text-orange-300" defaultOpen={false}>
          <div className="space-y-2">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
              <span className="text-white/60 text-[11px]">Text-to-Speech</span>
              <button
                onClick={() => {
                  setTtsEnabled(!ttsEnabled);
                  toast.success(ttsEnabled ? 'TTS disabled' : 'TTS enabled');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  ttsEnabled
                    ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {ttsEnabled ? 'On' : 'Off'}
              </button>
            </div>

            {/* Voice Selection */}
            {SpeechService.isSupported() && (
              <div>
                <label className="text-white/40 text-[10px] mb-1 block">Voice</label>
                <select
                  value={ttsVoice || ''}
                  onChange={(e) => {
                    setTtsVoice(e.target.value || null);
                    // Preview the voice
                    if (e.target.value) {
                      SpeechService.speak('Hello, I am your interview assistant.', {
                        voice: e.target.value,
                        rate: ttsRate,
                      });
                    }
                  }}
                  className="w-full input-sm bg-white/[0.03]"
                >
                  <option value="">System Default</option>
                  {availableVoices.map((v, i) => (
                    <option key={i} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speech Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/40 text-[10px]">Speed</label>
                <span className="text-white/40 text-[10px] font-mono">{ttsRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsRate}
                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-white/20 text-[9px] mt-0.5">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>

            {!SpeechService.isSupported() && (
              <p className="text-red-300/60 text-[10px]">
                Speech synthesis not supported in this browser
              </p>
            )}
          </div>
        </AccordionSection>

        {/* Visibility Modes */}
        <AccordionSection title="Visibility Modes" icon={Layers} defaultOpen={false}>
          <div className="space-y-1">
            {modes.map((mode, i) => {
              const MIcon = mode.icon;
              const isCurrent = visibilityMode === mode.name.toLowerCase();
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-white/[0.06]' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MIcon className={`w-3.5 h-3.5 ${mode.color}`} />
                    <span className={`text-[11px] ${isCurrent ? 'text-white font-medium' : 'text-white/50'}`}>
                      {mode.name}
                    </span>
                  </div>
                  <span className="text-white/25 text-[10px]">{mode.opacity}</span>
                </div>
              );
            })}
          </div>
        </AccordionSection>

        {/* Shortcuts */}
        <AccordionSection title="Shortcuts" icon={Keyboard} defaultOpen={false}>
          <div className="space-y-1">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 bg-white/[0.02] rounded">
                <span className="text-white/40 text-[10px]">{s.desc}</span>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-purple-200/60 text-[10px] font-mono">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* About */}
        <div className="glass-panel-dark p-3 rounded-xl">
          <p className="text-white/40 text-[10px] font-medium mb-1">InterviewAce v2.0</p>
          <p className="text-white/20 text-[10px]">
            AI interview assistant powered by GPT-4o-mini
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
