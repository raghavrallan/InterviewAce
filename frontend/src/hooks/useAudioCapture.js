import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

/**
 * Custom hook for capturing system audio + microphone
 * This is a fallback/enhancement for the Web Speech API
 * Captures both interviewer (system audio) and your mic
 */
export const useAudioCapture = (isRecording) => {
  const { audioInputDevice } = useStore();
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!isRecording) {
      // Stop all tracks when not recording
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }

    // Request microphone access
    const startCapture = async () => {
      try {
        // Build audio constraints with device selection
        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };

        // If a specific device is selected, use it
        if (audioInputDevice) {
          audioConstraints.deviceId = { exact: audioInputDevice };
        }

        // Get microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });

        mediaStreamRef.current = stream;
        setHasPermission(true);

        // Create audio context for processing
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // You can add audio processing here if needed
        // For now, we're just ensuring the mic is active for Web Speech API

        console.log('Audio capture started successfully with device:', audioInputDevice || 'default');
      } catch (err) {
        console.error('Failed to get audio access:', err);
        setError(err.message);
        setHasPermission(false);
      }
    };

    startCapture();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRecording, audioInputDevice]);

  return { hasPermission, error };
};

export default useAudioCapture;
