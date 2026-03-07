import { useEffect, useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Wifi, WifiOff, Monitor, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

/**
 * Dual-Stream STT Component (Enhanced Mode - Default)
 * Two separate audio streams with two WebSocket connections:
 *   - Microphone -> /ws/transcribe?speaker=me       (user's voice)
 *   - System audio (getDisplayMedia loopback) -> /ws/transcribe?speaker=interviewer
 * 
 * Speaker labels are resolved via speakerMap from the store.
 * Interim transcripts are passed to parent with isFinal=false for inline display.
 */
function DualStreamSTT({ isRecording, onTranscript }) {
  const { speakerMap } = useStore();

  const [micConnected, setMicConnected] = useState(false);
  const [sysConnected, setSysConnected] = useState(false);
  const [sysAvailable, setSysAvailable] = useState(true);

  // Refs
  const micWsRef = useRef(null);
  const micRecorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const sysWsRef = useRef(null);
  const sysRecorderRef = useRef(null);
  const sysStreamRef = useRef(null);
  const isCleaningUpRef = useRef(false);

  // Stable refs for callbacks
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  const speakerMapRef = useRef(speakerMap);
  useEffect(() => { speakerMapRef.current = speakerMap; }, [speakerMap]);

  // Resolve speaker label from speakerMap
  const resolveLabel = useCallback((rawLabel) => {
    const map = speakerMapRef.current;
    if (rawLabel === 'me') return map?.[1] || 'Me';
    if (rawLabel === 'interviewer') return map?.[0] || 'Interviewer';
    return rawLabel;
  }, []);

  // Per-pipeline interim buffer (keyed by speakerLabel)
  const interimBuffersRef = useRef({ me: '', interviewer: '' });

  // Helper: create a MediaRecorder -> WebSocket pipeline for one stream
  const createStreamPipeline = useCallback((stream, speakerLabel, setConnected) => {
    const wsUrl = `ws://localhost:5000/ws/transcribe?language=en&speaker=${speakerLabel}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {};

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'transcript') {
          const speaker = resolveLabel(speakerLabel);

          if (data.is_final && data.transcript.trim()) {
            // Clear interim for this pipeline
            interimBuffersRef.current[speakerLabel] = '';

            if (onTranscriptRef.current) {
              onTranscriptRef.current({
                id: Date.now() + Math.random(),
                text: data.transcript,
                speaker,
                timestamp: new Date().toISOString(),
                isFinal: true,
                confidence: data.confidence,
              });
            }
          } else if (!data.is_final && data.transcript.trim()) {
            // Interim transcript -- pass to parent for inline display
            interimBuffersRef.current[speakerLabel] = data.transcript;

            if (onTranscriptRef.current) {
              onTranscriptRef.current({
                id: `interim-${speakerLabel}`,
                text: data.transcript,
                speaker,
                timestamp: new Date().toISOString(),
                isFinal: false,
              });
            }
          }
        } else if (data.type === 'utterance_end') {
          const buf = interimBuffersRef.current[speakerLabel];
          if (buf && buf.trim() && onTranscriptRef.current) {
            onTranscriptRef.current({
              id: Date.now() + Math.random(),
              text: buf.trim(),
              speaker: resolveLabel(speakerLabel),
              timestamp: new Date().toISOString(),
              isFinal: true,
            });
            interimBuffersRef.current[speakerLabel] = '';
          }
        } else if (data.type === 'status' && data.message === 'connected') {
          setConnected(true);
          startRecorder(stream, ws, speakerLabel);
        } else if (data.type === 'status' && data.message === 'disconnected') {
          setConnected(false);
        } else if (data.type === 'error') {
          console.error(`[DualSTT:${speakerLabel}] Error:`, data.message);
          toast.error(`${resolveLabel(speakerLabel)}: ${data.message}`, { duration: 4000 });
        }
      } catch (err) {
        console.error(`[DualSTT:${speakerLabel}] Parse error:`, err);
      }
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);

    return ws;
  }, [resolveLabel]);

  const startRecorder = (stream, ws, label) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };
      recorder.onerror = (e) => console.error(`[DualSTT:${label}] Recorder error:`, e.error);
      // 100ms chunks for lower latency (Deepgram recommended)
      recorder.start(100);

      if (label === 'me') micRecorderRef.current = recorder;
      else sysRecorderRef.current = recorder;

      console.log(`[DualSTT:${label}] Recording started (100ms chunks)`);
    } catch (error) {
      console.error(`[DualSTT:${label}] Recorder failed:`, error);
    }
  };

  const stopAll = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Stop recorders
    [micRecorderRef, sysRecorderRef].forEach(ref => {
      if (ref.current && ref.current.state !== 'inactive') {
        try { ref.current.stop(); } catch (_) {}
      }
      ref.current = null;
    });

    // Close WebSockets
    [micWsRef, sysWsRef].forEach(ref => {
      if (ref.current) {
        try { if (ref.current.readyState === WebSocket.OPEN) ref.current.close(1000); } catch (_) {}
        ref.current = null;
      }
    });

    // Stop media streams
    [micStreamRef, sysStreamRef].forEach(ref => {
      if (ref.current) {
        ref.current.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        ref.current = null;
      }
    });

    interimBuffersRef.current = { me: '', interviewer: '' };
    setMicConnected(false);
    setSysConnected(false);
    isCleaningUpRef.current = false;
  }, []);

  // Capture system audio via getDisplayMedia (Electron auto-handles via setDisplayMediaRequestHandler)
  const captureSystemAudio = async () => {
    try {
      const sysStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: { width: 1, height: 1 },
      });

      if (sysStream.getAudioTracks().length === 0) {
        throw new Error('No system audio track available');
      }

      // Stop video tracks -- we only need audio
      sysStream.getVideoTracks().forEach(t => t.stop());

      const audioOnlyStream = new MediaStream(sysStream.getAudioTracks());
      sysStreamRef.current = audioOnlyStream;
      setSysAvailable(true);

      return audioOnlyStream;
    } catch (err) {
      console.warn('[DualSTT] System audio capture failed:', err.message);
      setSysAvailable(false);
      return null;
    }
  };

  const startDualStreaming = async () => {
    stopAll();

    try {
      // 1. Get microphone audio
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;

      // 2. Get system audio
      const sysAudioStream = await captureSystemAudio();

      if (!sysAudioStream) {
        toast('System audio unavailable. Only your microphone will be captured.\nInterviewer audio will not appear in transcript.', {
          duration: 4000,
          icon: '\u26A0\uFE0F',
        });
      }

      // 3. Open WebSocket pipelines
      toast.success('Dual-stream: recording started', { duration: 1500 });

      // Mic pipeline (always)
      micWsRef.current = createStreamPipeline(micStream, 'me', setMicConnected);

      // System audio pipeline (if available)
      if (sysAudioStream) {
        sysWsRef.current = createStreamPipeline(sysAudioStream, 'interviewer', setSysConnected);
      }

    } catch (error) {
      console.error('[DualSTT] Failed:', error);
      if (error.name === 'NotAllowedError') toast.error('Microphone permission denied');
      else toast.error('Failed to start: ' + error.message);
    }
  };

  // Retry system audio capture while recording
  const retrySysAudio = async () => {
    if (!isRecording) return;

    // Clean up previous system audio
    if (sysRecorderRef.current && sysRecorderRef.current.state !== 'inactive') {
      try { sysRecorderRef.current.stop(); } catch (_) {}
    }
    sysRecorderRef.current = null;
    if (sysWsRef.current) {
      try { if (sysWsRef.current.readyState === WebSocket.OPEN) sysWsRef.current.close(1000); } catch (_) {}
      sysWsRef.current = null;
    }
    if (sysStreamRef.current) {
      sysStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      sysStreamRef.current = null;
    }
    setSysConnected(false);

    const sysAudioStream = await captureSystemAudio();
    if (sysAudioStream) {
      sysWsRef.current = createStreamPipeline(sysAudioStream, 'interviewer', setSysConnected);
      toast.success('System audio connected!', { duration: 1500 });
    } else {
      toast.error('System audio still unavailable', { duration: 2000 });
    }
  };

  useEffect(() => {
    if (isRecording) startDualStreaming();
    else stopAll();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return (
    <div className="dual-stream-stt">
      <div className="flex items-center gap-3 text-sm text-gray-400">
        {isRecording ? (
          <>
            {/* Mic status */}
            <div className="flex items-center gap-1">
              <Mic className="h-3.5 w-3.5 text-green-500 animate-pulse" />
              <span className="text-[9px]">{micConnected ? resolveLabel('me') : '...'}</span>
              {micConnected && <Wifi className="h-2.5 w-2.5 text-green-400" />}
            </div>
            {/* System audio status */}
            <div className="flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[9px]">
                {sysConnected ? resolveLabel('interviewer') : (sysAvailable ? '...' : 'N/A')}
              </span>
              {sysConnected && <Wifi className="h-2.5 w-2.5 text-blue-400" />}
            </div>
            {/* Retry button when system audio failed */}
            {!sysAvailable && (
              <button
                onClick={retrySysAudio}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-300 text-[9px] border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                title="Retry system audio capture"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Retry</span>
              </button>
            )}
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4 text-gray-500" />
            <span className="text-[10px]">Enhanced mode (not recording)</span>
          </>
        )}
      </div>
    </div>
  );
}

export default DualStreamSTT;
