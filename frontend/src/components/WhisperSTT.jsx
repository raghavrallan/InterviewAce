import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

/**
 * Whisper API STT Component - More reliable than Web Speech API in Electron
 * Records audio chunks and sends to backend for transcription
 */
function WhisperSTT({ isRecording, onTranscript }) {
  const { i18n } = useTranslation();
  const [interimTranscript, setInterimTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const transcriptionTimerRef = useRef(null);

  // Initialize microphone
  const initializeMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Send for transcription when stopped
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          await transcribeAudio();
        }
      };

      console.log('✅ Microphone initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize microphone:', error);

      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow access in your browser settings.');
      } else {
        toast.error('Failed to access microphone. Please check your device settings.');
      }

      return false;
    }
  };

  // Transcribe audio using Whisper API
  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    try {
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      // Skip if audio is too small (less than 0.5 seconds)
      if (audioBlob.size < 5000) {
        console.log('⏩ Skipping transcription - audio chunk too small');
        audioChunksRef.current = [];
        return;
      }

      setInterimTranscript('Transcribing...');

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('language', i18n.language.split('-')[0]); // 'en' from 'en-US'

      // Send to backend for transcription
      const response = await axios.post(`${API_URL}/transcription/stream`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.success && response.data.transcript.trim()) {
        const transcript = response.data.transcript.trim();

        console.log('✅ Transcription received:', transcript);

        // Send to parent component
        onTranscript({
          id: Date.now() + Math.random(),
          text: transcript,
          speaker: 'Interviewer',
          timestamp: new Date().toISOString(),
          isFinal: true,
        });

        setInterimTranscript('');
      }

    } catch (error) {
      console.error('❌ Transcription error:', error);

      if (error.code === 'ECONNABORTED') {
        toast.error('Transcription timeout. Please try again.');
      } else if (error.response?.status === 429) {
        toast.error('Too many requests. Please slow down.');
      } else {
        console.warn('Transcription failed, will retry next chunk');
      }

      setInterimTranscript('');
    } finally {
      // Clear audio chunks
      audioChunksRef.current = [];
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const initialized = await initializeMicrophone();
      if (!initialized) return;

      // Start recording in chunks (every 3 seconds)
      mediaRecorderRef.current.start(3000);

      console.log('🎤 Recording started - sending audio chunks every 3 seconds');
      toast.success('Listening to microphone...', { duration: 2000 });

      // Set up periodic transcription every 3 seconds
      transcriptionTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          // Stop and restart to trigger ondataavailable and onstop
          mediaRecorderRef.current.stop();

          setTimeout(() => {
            if (isRecording && mediaRecorderRef.current) {
              mediaRecorderRef.current.start(3000);
            }
          }, 100);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      toast.error('Failed to start recording. Please try again.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    try {
      // Clear timer
      if (transcriptionTimerRef.current) {
        clearInterval(transcriptionTimerRef.current);
        transcriptionTimerRef.current = null;
      }

      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Clear buffers
      audioChunksRef.current = [];
      setInterimTranscript('');

      console.log('⏹️ Recording stopped');
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
    }
  };

  // Handle recording state changes
  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      stopRecording();
    };
  }, [isRecording]);

  return (
    <div className="whisper-stt">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {isRecording ? (
          <>
            <Mic className="h-4 w-4 text-green-500 animate-pulse" />
            <span>Listening via Whisper API</span>
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4 text-gray-500" />
            <span>Not recording</span>
          </>
        )}
      </div>

      {/* Interim transcript display */}
      {interimTranscript && (
        <div className="mt-2 p-2 bg-gray-800/50 rounded text-sm text-gray-300 italic">
          {interimTranscript}
        </div>
      )}
    </div>
  );
}

export default WhisperSTT;
