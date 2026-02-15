import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

/**
 * Deepgram Real-Time STT Component (Diarization Mode)
 * Single mic stream with Deepgram's AI speaker diarization.
 * Speaker IDs (0, 1, ...) are mapped to labels via speakerMap in store.
 */
function DeepgramSTT({ isRecording, onTranscript }) {
  const { speakerMap } = useStore();
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const interimBufferRef = useRef('');
  const isCleaningUpRef = useRef(false);

  // Stable refs
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  const speakerMapRef = useRef(speakerMap);
  useEffect(() => { speakerMapRef.current = speakerMap; }, [speakerMap]);

  const resolveSpeaker = (data) => {
    // Explicit speaker label from dual-stream mode
    if (data.speaker) {
      return data.speaker === 'me' ? (speakerMapRef.current?.[1] || 'Me') : (speakerMapRef.current?.[0] || 'Interviewer');
    }
    // Diarization speaker ID
    if (data.speaker_id !== undefined && data.speaker_id !== null) {
      return speakerMapRef.current?.[data.speaker_id] || `Speaker ${data.speaker_id}`;
    }
    return 'Speaker';
  };

  const stopStreaming = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    mediaRecorderRef.current = null;

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'stopped');
        }
      } catch (_) {}
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => { try { track.stop(); } catch (_) {} });
      streamRef.current = null;
    }

    interimBufferRef.current = '';
    setInterimTranscript('');
    setIsConnected(false);
    isCleaningUpRef.current = false;
  };

  const startStreaming = async () => {
    stopStreaming();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // No speaker param -> backend enables diarize=true
      const wsUrl = `ws://localhost:5000/ws/transcribe?language=en`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {};

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'transcript') {
            const speaker = resolveSpeaker(data);

            if (data.is_final) {
              interimBufferRef.current = '';
              setInterimTranscript('');

              if (onTranscriptRef.current && data.transcript.trim()) {
                onTranscriptRef.current({
                  id: Date.now() + Math.random(),
                  text: data.transcript,
                  speaker,
                  speakerId: data.speaker_id,
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
              setIsConnected(true);
              toast.success('Real-time transcription active', { duration: 1500 });
              beginMediaRecording(stream, ws);
            } else if (data.message === 'disconnected') {
              setIsConnected(false);
            }
          } else if (data.type === 'error') {
            console.error('[DeepgramSTT] Error:', data.message);
            toast.error(data.message, { duration: 4000 });
          }
        } catch (err) {
          console.error('[DeepgramSTT] Parse error:', err);
        }
      };

      ws.onerror = () => setIsConnected(false);
      ws.onclose = () => setIsConnected(false);

    } catch (error) {
      console.error('[DeepgramSTT] Failed:', error);
      if (error.name === 'NotAllowedError') toast.error('Microphone permission denied');
      else if (error.name === 'NotFoundError') toast.error('No microphone found');
      else toast.error('Failed to access microphone: ' + error.message);
    }
  };

  const beginMediaRecording = (stream, ws) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(event.data);
      };
      mediaRecorder.onerror = (event) => console.error('[DeepgramSTT] MediaRecorder error:', event.error);
      mediaRecorder.start(250);
    } catch (error) {
      console.error('[DeepgramSTT] MediaRecorder failed:', error);
      toast.error('Audio recording failed: ' + error.message);
    }
  };

  useEffect(() => {
    if (isRecording) startStreaming();
    else stopStreaming();
    return () => stopStreaming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return (
    <div className="deepgram-stt">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {isRecording ? (
          <>
            <Mic className="h-4 w-4 text-green-500 animate-pulse" />
            <span className="text-[10px]">{isConnected ? 'Streaming (Deepgram + Diarize)' : 'Connecting...'}</span>
            {isConnected ? <Wifi className="h-3 w-3 text-green-400" /> : <WifiOff className="h-3 w-3 text-yellow-400 animate-pulse" />}
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4 text-gray-500" />
            <span className="text-[10px]">Not recording</span>
          </>
        )}
      </div>
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
