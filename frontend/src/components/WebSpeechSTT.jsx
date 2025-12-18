import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import AudioCaptureService from '../services/AudioCaptureService';
import { getSpeechLanguageCode } from '../i18n';

/**
 * Web Speech API STT Component with Dual Audio Capture
 * Captures both system audio (interviewer) and microphone (user)
 * Uses electron-audio-loopback for system audio capture
 * Supports: Chrome, Edge, Safari, Opera
 */
function WebSpeechSTT({ isRecording, onTranscript }) {
  const { i18n } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState({ system: 0, mic: 0 });
  const [captureMode, setCaptureMode] = useState('mic-only'); // 'mic-only', 'dual-audio'
  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const audioCaptureInitialized = useRef(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const networkErrorCountRef = useRef(0);
  const MAX_NETWORK_RETRIES = 3;

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      toast.error('Speech recognition not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setIsSupported(true);

    // Initialize Speech Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Get partial results
    recognition.lang = getSpeechLanguageCode(currentLanguage); // Use selected language
    recognition.maxAlternatives = 1;

    console.log(`🌐 Speech recognition language set to: ${recognition.lang}`);

    // Handle results
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      // Reset network error counter on successful result
      if (networkErrorCountRef.current > 0) {
        console.log('✅ Speech recognition working! Resetting error counter.');
        networkErrorCountRef.current = 0;
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      // Update interim transcript
      if (interim) {
        setInterimTranscript(interim);
      }

      // Process final transcript
      if (final.trim()) {
        const cleanedTranscript = final.trim();
        transcriptBufferRef.current += cleanedTranscript + ' ';

        // Check if we have a complete sentence
        if (isCompleteSentence(transcriptBufferRef.current)) {
          const sentence = transcriptBufferRef.current.trim();

          // Send to parent component
          onTranscript({
            id: Date.now() + Math.random(),
            text: sentence,
            speaker: 'Interviewer',
            timestamp: new Date().toISOString(),
            isFinal: true,
          });

          // Clear buffer
          transcriptBufferRef.current = '';
          setInterimTranscript('');
        }
      }
    };

    // Handle errors
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        // No speech detected, just continue
        return;
      }

      if (event.error === 'aborted') {
        // Aborted by user or system, just continue
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
        networkErrorCountRef.current = 0; // Reset counter
      } else if (event.error === 'network') {
        networkErrorCountRef.current += 1;
        console.warn(`Network error (attempt ${networkErrorCountRef.current}/${MAX_NETWORK_RETRIES}) - This is common in Electron and usually safe to ignore`);

        if (networkErrorCountRef.current >= MAX_NETWORK_RETRIES) {
          console.warn('⚠️ Max network error retries reached. Speech recognition may still work despite errors.');
          // Don't show error toast - these errors are common in Electron but recognition often works anyway
          // Reset counter to allow future retries
          networkErrorCountRef.current = 0;
        }
      } else if (event.error === 'service-not-allowed') {
        toast.error('Speech recognition service not available. Please check your internet connection.');
        networkErrorCountRef.current = 0; // Reset counter
      } else {
        console.error('Recognition error:', event.error);
        networkErrorCountRef.current = 0; // Reset counter
      }
    };

    // Handle start
    recognition.onstart = () => {
      console.log('✅ Speech recognition is now active and listening');
    };

    // Handle end (auto-restart)
    recognition.onend = () => {
      console.log('Speech recognition ended');

      // Stop restarting if we've hit max network errors
      if (networkErrorCountRef.current >= MAX_NETWORK_RETRIES) {
        console.log('⏸️ Pausing auto-restart due to repeated network errors. Recognition may still work - try speaking!');
        return;
      }

      if (isRecording) {
        // Auto-restart if still recording (with delay to prevent rapid loops)
        setTimeout(() => {
          if (isRecording && networkErrorCountRef.current < MAX_NETWORK_RETRIES) {
            try {
              recognition.start();
              console.log('♻️ Speech recognition restarted');
            } catch (err) {
              if (!err.message.includes('already started')) {
                console.error('Failed to restart recognition:', err);
              }
            }
          }
        }, 1000); // Increased delay to 1 second to prevent rapid error loops
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, currentLanguage]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      console.log(`🌐 Language changed to: ${lng}`);
      setCurrentLanguage(lng);

      // Update recognition language if it exists
      if (recognitionRef.current) {
        const newLang = getSpeechLanguageCode(lng);
        recognitionRef.current.lang = newLang;
        console.log(`🔄 Updated speech recognition language to: ${newLang}`);

        // If currently recording, restart recognition with new language
        if (isRecording) {
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              try {
                recognitionRef.current.start();
                toast.success(`Now recognizing speech in ${newLang.split('-')[0].toUpperCase()}`);
              } catch (err) {
                console.error('Failed to restart recognition:', err);
              }
            }, 300);
          } catch (err) {
            console.error('Failed to stop recognition:', err);
          }
        }
      }
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, isRecording]);

  // Initialize AudioCaptureService
  useEffect(() => {
    const initAudioCapture = async () => {
      try {
        if (!AudioCaptureService.isSupported()) {
          console.warn('AudioCaptureService not supported');
          return;
        }

        await AudioCaptureService.initialize();
        audioCaptureInitialized.current = true;

        // Setup audio level callback
        AudioCaptureService.setAudioLevelCallback((type, level) => {
          setAudioLevels(prev => ({ ...prev, [type]: level }));
        });

        console.log('✅ AudioCaptureService initialized');
      } catch (error) {
        console.error('❌ Failed to initialize AudioCaptureService:', error);
      }
    };

    initAudioCapture();

    return () => {
      if (audioCaptureInitialized.current) {
        AudioCaptureService.destroy();
      }
    };
  }, []);

  // Start/stop recognition based on isRecording prop
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      // Reset error counter for fresh start
      networkErrorCountRef.current = 0;
      console.log('🔄 Starting new recording session - error counter reset');

      const startRecording = async () => {
        try {
          // Try to start dual audio capture if enabled and supported
          if (captureMode === 'dual-audio' && AudioCaptureService.isLoopbackSupported()) {
            try {
              console.log('🎙️ Starting dual audio capture...');
              await AudioCaptureService.startCapture();
              toast.success('Capturing system audio + microphone', { duration: 2000 });
            } catch (audioError) {
              console.warn('⚠️ Dual audio capture failed, falling back to mic-only:', audioError);
              toast.error('Could not capture system audio. Using mic only.', { duration: 3000 });
              setCaptureMode('mic-only');
            }
          } else {
            console.log('🎤 Using microphone only');
            toast.success('Listening to microphone...', { duration: 2000 });
          }

          // Start speech recognition (with small delay)
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log('✅ Speech recognition started');
            } catch (err) {
              if (err.message.includes('already started')) {
                console.log('Recognition already active');
                return;
              }
              console.error('Failed to start recognition:', err);
              toast.error('Failed to start speech recognition. Please try again.');
            }
          }, 100);
        } catch (error) {
          console.error('❌ Failed to start recording:', error);
          toast.error('Failed to start recording. Please try again.');
        }
      };

      startRecording();
    } else {
      // Stop recording
      try {
        recognitionRef.current.stop();
        transcriptBufferRef.current = '';
        setInterimTranscript('');

        // Stop audio capture
        if (captureMode === 'dual-audio') {
          AudioCaptureService.stopCapture();
          console.log('⏹️ Audio capture stopped');
        }
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
  }, [isRecording, captureMode]);

  // Check if transcript is a complete sentence
  const isCompleteSentence = (text) => {
    const trimmed = text.trim();

    // Check for sentence-ending punctuation (added by some browsers)
    // or minimum word count
    const hasEndPunctuation = /[.!?]$/.test(trimmed);
    const wordCount = trimmed.split(/\s+/).length;
    const hasPause = wordCount >= 5; // Assume pause after 5+ words

    return hasEndPunctuation || hasPause;
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-red-500/20 rounded-xl text-red-300 text-sm">
        ⚠️ Speech recognition not supported. Please use Chrome, Edge, or Safari.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Dual Audio Mode Toggle */}
      {AudioCaptureService.isLoopbackSupported() && !isRecording && (
        <div className="glass-panel-dark p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span className="text-white/80 text-sm font-medium">Dual Audio Capture</span>
            </div>
            <button
              onClick={() => setCaptureMode(prev => prev === 'mic-only' ? 'dual-audio' : 'mic-only')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                captureMode === 'dual-audio'
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                  : 'bg-white/10 text-white/60 border border-white/20'
              }`}
            >
              {captureMode === 'dual-audio' ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <p className="text-white/50 text-xs mt-2">
            {captureMode === 'dual-audio'
              ? '✅ Will capture both system audio and microphone'
              : '🎤 Will capture microphone only'}
          </p>
        </div>
      )}

      {/* Audio Level Indicators */}
      {isRecording && captureMode === 'dual-audio' && (
        <div className="glass-panel-dark p-3 rounded-xl space-y-2">
          {/* System Audio Level */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-3 h-3 text-green-400" />
                <span className="text-white/70 text-xs">System Audio</span>
              </div>
              <span className="text-white/50 text-xs">{Math.round(audioLevels.system * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-150"
                style={{ width: `${audioLevels.system * 100}%` }}
              />
            </div>
          </div>

          {/* Microphone Level */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Mic className="w-3 h-3 text-blue-400" />
                <span className="text-white/70 text-xs">Microphone</span>
              </div>
              <span className="text-white/50 text-xs">{Math.round(audioLevels.mic * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-150"
                style={{ width: `${audioLevels.mic * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live interim transcript */}
      {interimTranscript && (
        <div className="p-3 glass-panel-dark rounded-xl">
          <div className="flex items-center space-x-2 mb-2">
            <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-purple-300 text-xs font-semibold">Listening...</span>
          </div>
          <p className="text-white/60 text-sm italic">{interimTranscript}</p>
        </div>
      )}

      {/* Instructions */}
      {isRecording && !interimTranscript && (
        <div className="text-white/50 text-xs text-center">
          {captureMode === 'dual-audio'
            ? 'Listening to system audio and microphone...'
            : 'Speak into your microphone...'}
        </div>
      )}
    </div>
  );
}

export default WebSpeechSTT;
