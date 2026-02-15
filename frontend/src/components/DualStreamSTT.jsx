import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Wifi, WifiOff, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Dual-Stream STT Component (Enhanced Mode)
 * Two separate audio streams with two WebSocket connections:
 *   - Microphone -> /ws/transcribe?speaker=me
 *   - System audio (getDisplayMedia) -> /ws/transcribe?speaker=interviewer
 */
function DualStreamSTT({ isRecording, onTranscript }) {
  const [micConnected, setMicConnected] = useState(false);
  const [sysConnected, setSysConnected] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Mic refs
  const micWsRef = useRef(null);
  const micRecorderRef = useRef(null);
  const micStreamRef = useRef(null);

  // System audio refs
  const sysWsRef = useRef(null);
  const sysRecorderRef = useRef(null);
  const sysStreamRef = useRef(null);

  const interimBufferRef = useRef('');
  const isCleaningUpRef = useRef(false);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Helper: create a MediaRecorder -> WebSocket pipeline
  const createStreamPipeline = (stream, speakerLabel, setConnected) => {
    const wsUrl = `ws://localhost:5000/ws/transcribe?language=en&speaker=${speakerLabel}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {};

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'transcript') {
          const speaker = data.speaker === 'me' ? 'Me' : 'Interviewer';

          if (data.is_final && data.transcript.trim()) {
            interimBufferRef.current = '';
            setInterimTranscript('');

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
          } else if (!data.is_final) {
            interimBufferRef.current = data.transcript;
            setInterimTranscript(`[${speaker}] ${data.transcript}`);
          }
        } else if (data.type === 'utterance_end') {
          if (interimBufferRef.current.trim() && onTranscriptRef.current) {
            const speaker = speakerLabel === 'me' ? 'Me' : 'Interviewer';
            onTranscriptRef.current({
              id: Date.now() + Math.random(),
              text: interimBufferRef.current.trim(),
              speaker,
              timestamp: new Date().toISOString(),
              isFinal: true,
            });
            interimBufferRef.current = '';
            setInterimTranscript('');
          }
        } else if (data.type === 'status' && data.message === 'connected') {
          setConnected(true);
          // Start MediaRecorder once Deepgram is ready
          startRecorder(stream, ws, speakerLabel);
        } else if (data.type === 'status' && data.message === 'disconnected') {
          setConnected(false);
        } else if (data.type === 'error') {
          console.error(`[DualSTT:${speakerLabel}] Error:`, data.message);
          toast.error(`${speakerLabel}: ${data.message}`, { duration: 4000 });
        }
      } catch (err) {
        console.error(`[DualSTT:${speakerLabel}] Parse error:`, err);
      }
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);

    return ws;
  };

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
      recorder.start(250);

      if (label === 'me') micRecorderRef.current = recorder;
      else sysRecorderRef.current = recorder;

      console.log(`[DualSTT:${label}] Recording started`);
    } catch (error) {
      console.error(`[DualSTT:${label}] Recorder failed:`, error);
    }
  };

  const stopAll = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Stop mic recorder
    if (micRecorderRef.current && micRecorderRef.current.state !== 'inactive') {
      try { micRecorderRef.current.stop(); } catch (_) {}
    }
    micRecorderRef.current = null;

    // Stop system recorder
    if (sysRecorderRef.current && sysRecorderRef.current.state !== 'inactive') {
      try { sysRecorderRef.current.stop(); } catch (_) {}
    }
    sysRecorderRef.current = null;

    // Close mic WS
    if (micWsRef.current) {
      try { if (micWsRef.current.readyState === WebSocket.OPEN) micWsRef.current.close(1000); } catch (_) {}
      micWsRef.current = null;
    }

    // Close system WS
    if (sysWsRef.current) {
      try { if (sysWsRef.current.readyState === WebSocket.OPEN) sysWsRef.current.close(1000); } catch (_) {}
      sysWsRef.current = null;
    }

    // Stop mic stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      micStreamRef.current = null;
    }

    // Stop system stream
    if (sysStreamRef.current) {
      sysStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      sysStreamRef.current = null;
    }

    interimBufferRef.current = '';
    setInterimTranscript('');
    setMicConnected(false);
    setSysConnected(false);
    isCleaningUpRef.current = false;
  };

  const startDualStreaming = async () => {
    stopAll();

    try {
      // 1. Get microphone audio
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;

      // 2. Get system audio via getDisplayMedia
      let sysStream = null;
      try {
        sysStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: { width: 1, height: 1 }, // minimal video to reduce overhead
        });

        // Check if we got audio tracks
        if (sysStream.getAudioTracks().length === 0) {
          throw new Error('No system audio captured. Please check "Share audio" when sharing screen.');
        }

        // Stop video tracks - we only need audio
        sysStream.getVideoTracks().forEach(t => t.stop());

        // Create audio-only stream
        const audioOnlyStream = new MediaStream(sysStream.getAudioTracks());
        sysStreamRef.current = audioOnlyStream;
      } catch (sysError) {
        console.warn('[DualSTT] System audio not available, falling back to mic-only with diarization hint');
        toast('System audio unavailable. Using microphone only.', { duration: 3000, icon: '⚠️' });
        // Continue with mic only - no system audio stream
      }

      // 3. Open WebSocket connections
      toast.success('Enhanced mode: streaming started', { duration: 1500 });

      // Mic WebSocket (always available)
      micWsRef.current = createStreamPipeline(micStream, 'me', setMicConnected);

      // System audio WebSocket (only if available)
      if (sysStreamRef.current) {
        sysWsRef.current = createStreamPipeline(sysStreamRef.current, 'interviewer', setSysConnected);
      }

    } catch (error) {
      console.error('[DualSTT] Failed:', error);
      if (error.name === 'NotAllowedError') toast.error('Permission denied');
      else toast.error('Failed to start: ' + error.message);
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
              <span className="text-[9px]">{micConnected ? 'Me' : '...'}</span>
              {micConnected && <Wifi className="h-2.5 w-2.5 text-green-400" />}
            </div>
            {/* System audio status */}
            <div className="flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[9px]">{sysConnected ? 'Interviewer' : (sysStreamRef.current ? '...' : 'N/A')}</span>
              {sysConnected && <Wifi className="h-2.5 w-2.5 text-blue-400" />}
            </div>
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4 text-gray-500" />
            <span className="text-[10px]">Enhanced mode (not recording)</span>
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

export default DualStreamSTT;
