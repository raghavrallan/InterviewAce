import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

/**
 * Web Speech API STT Component
 * Free, built-in browser speech recognition (no API keys needed!)
 * Supports: Chrome, Edge, Safari, Opera
 */
function WebSpeechSTT({ isRecording, onTranscript }) {
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef('');

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
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

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
      } else if (event.error === 'network') {
        // Network error in Electron is often a false alarm - just retry
        console.warn('Network error (likely false alarm in Electron), retrying...');
        // Don't show error to user, will auto-restart
      } else if (event.error === 'service-not-allowed') {
        toast.error('Speech recognition service not available. Please check your internet connection.');
      } else {
        console.error('Recognition error:', event.error);
        // Don't show toast for other errors to avoid spam
      }
    };

    // Handle start
    recognition.onstart = () => {
      console.log('✅ Speech recognition is now active and listening');
    };

    // Handle end (auto-restart)
    recognition.onend = () => {
      console.log('Speech recognition ended');
      if (isRecording) {
        // Auto-restart if still recording (with small delay to prevent rapid loops)
        setTimeout(() => {
          if (isRecording) {
            try {
              recognition.start();
              console.log('♻️ Speech recognition restarted');
            } catch (err) {
              if (!err.message.includes('already started')) {
                console.error('Failed to restart recognition:', err);
              }
            }
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  // Start/stop recognition based on isRecording prop
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      // Add a small delay before starting to ensure everything is initialized
      const startTimer = setTimeout(() => {
        try {
          recognitionRef.current.start();
          console.log('Speech recognition started');
          toast.success('Listening to microphone...', { duration: 2000 });
        } catch (err) {
          if (err.message.includes('already started')) {
            // Already started, ignore
            console.log('Recognition already active');
            return;
          }
          console.error('Failed to start recognition:', err);
          toast.error('Failed to start microphone. Please try again.');
        }
      }, 100);

      return () => clearTimeout(startTimer);
    } else {
      try {
        recognitionRef.current.stop();
        transcriptBufferRef.current = '';
        setInterimTranscript('');
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
  }, [isRecording]);

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
    <div className="space-y-2">
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
          Speak into your microphone...
        </div>
      )}
    </div>
  );
}

export default WebSpeechSTT;
