import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Deepgram Real-Time STT Component
 * Uses MediaRecorder (webm/opus) -> WebSocket -> Backend proxy -> Deepgram Nova-3
 * MediaRecorder is safe with Electron's disableHardwareAcceleration() (unlike AudioContext)
 */
function DeepgramSTT({ isRecording, onTranscript }) {
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const interimBufferRef = useRef('');
  const isCleaningUpRef = useRef(false);

  // Stable ref for onTranscript to avoid re-render loops
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Stop recording and clean up everything
  const stopStreaming = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    mediaRecorderRef.current = null;

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'stopped');
        }
      } catch (_) {}
      wsRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
      streamRef.current = null;
    }

    // Clear state
    interimBufferRef.current = '';
    setInterimTranscript('');
    setIsConnected(false);
    isCleaningUpRef.current = false;

    console.log('[DeepgramSTT] Stopped');
  };

  // Start recording and streaming
  const startStreaming = async () => {
    // Clean up any previous session
    stopStreaming();

    try {
      // 1. Get microphone access
      console.log('[DeepgramSTT] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      console.log('[DeepgramSTT] Microphone acquired');

      // 2. Determine WebSocket URL (same host as page, or direct to backend)
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Electron (loading from localhost:3100 via nginx), we go direct to backend
      const wsUrl = `ws://localhost:5000/ws/transcribe?language=en`;
      console.log('[DeepgramSTT] Connecting to:', wsUrl);

      // 3. Open WebSocket to backend proxy
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[DeepgramSTT] WebSocket connected, waiting for Deepgram...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'transcript') {
            if (data.is_final) {
              interimBufferRef.current = '';
              setInterimTranscript('');

              if (onTranscriptRef.current && data.transcript.trim()) {
                onTranscriptRef.current({
                  id: Date.now() + Math.random(),
                  text: data.transcript,
                  speaker: 'Speaker',
                  timestamp: new Date().toISOString(),
                  isFinal: true,
                  confidence: data.confidence,
                });
              }
            } else {
              interimBufferRef.current = data.transcript;
              setInterimTranscript(data.transcript);
            }
          } else if (data.type === 'utterance_end') {
            if (interimBufferRef.current.trim()) {
              if (onTranscriptRef.current) {
                onTranscriptRef.current({
                  id: Date.now() + Math.random(),
                  text: interimBufferRef.current.trim(),
                  speaker: 'Speaker',
                  timestamp: new Date().toISOString(),
                  isFinal: true,
                });
              }
              interimBufferRef.current = '';
              setInterimTranscript('');
            }
          } else if (data.type === 'status') {
            if (data.message === 'connected') {
              console.log('[DeepgramSTT] Deepgram session ready, starting MediaRecorder');
              setIsConnected(true);
              toast.success('Real-time transcription active', { duration: 1500 });
              beginMediaRecording(stream, ws);
            } else if (data.message === 'disconnected') {
              setIsConnected(false);
            }
          } else if (data.type === 'error') {
            console.error('[DeepgramSTT] Error from server:', data.message);
            toast.error(data.message, { duration: 4000 });
          }
        } catch (err) {
          console.error('[DeepgramSTT] Parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[DeepgramSTT] WebSocket error');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('[DeepgramSTT] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('[DeepgramSTT] Failed to start:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found');
      } else {
        toast.error('Failed to access microphone: ' + error.message);
      }
    }
  };

  // Start MediaRecorder to capture audio chunks and send via WebSocket
  const beginMediaRecording = (stream, ws) => {
    try {
      // Use webm/opus which Deepgram supports natively
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[DeepgramSTT] MediaRecorder error:', event.error);
      };

      mediaRecorder.onstop = () => {
        console.log('[DeepgramSTT] MediaRecorder stopped');
      };

      // Record in 250ms chunks for low latency
      mediaRecorder.start(250);
      console.log('[DeepgramSTT] MediaRecorder started (250ms chunks, ' + mimeType + ')');
    } catch (error) {
      console.error('[DeepgramSTT] MediaRecorder failed:', error);
      toast.error('Audio recording failed: ' + error.message);
    }
  };

  // Handle recording state changes
  useEffect(() => {
    if (isRecording) {
      startStreaming();
    } else {
      stopStreaming();
    }

    return () => {
      stopStreaming();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return (
    <div className="deepgram-stt">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {isRecording ? (
          <>
            <Mic className="h-4 w-4 text-green-500 animate-pulse" />
            <span className="text-[10px]">
              {isConnected ? 'Streaming (Deepgram)' : 'Connecting...'}
            </span>
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-400" />
            ) : (
              <WifiOff className="h-3 w-3 text-yellow-400 animate-pulse" />
            )}
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4 text-gray-500" />
            <span className="text-[10px]">Not recording</span>
          </>
        )}
      </div>

      {/* Interim transcript display */}
      {interimTranscript && (
        <div className="mt-1 px-2 py-1 bg-purple-500/10 rounded text-[10px] text-purple-200/70 italic border border-purple-500/10">
          {interimTranscript}
          <span className="inline-block w-1 h-2.5 bg-purple-400 ml-0.5 animate-pulse rounded-sm"></span>
        </div>
      )}
    </div>
  );
}

export default DeepgramSTT;
