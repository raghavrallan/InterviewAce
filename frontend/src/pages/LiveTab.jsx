import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Play, Square, Send, Loader, ChevronDown, Volume2, VolumeX, User, Monitor, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import SpeechService from '../services/SpeechService';

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        className="rounded-lg my-2 text-xs"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-purple-900/30 px-1 py-0.5 rounded text-purple-200 text-xs" {...props}>
        {children}
      </code>
    );
  }
};

/**
 * Group consecutive FINAL transcripts from the same speaker into combined entries.
 * Interim (isFinal===false) transcripts are kept as separate entries at the end.
 */
function groupTranscripts(transcripts) {
  if (!transcripts.length) return [];

  const finals = transcripts.filter(t => t.isFinal !== false);
  const interims = transcripts.filter(t => t.isFinal === false);

  const groups = [];
  let current = null;

  for (const t of finals) {
    const speaker = t.speaker || 'Speaker';
    if (current && current.speaker === speaker) {
      current.texts.push(t.text);
      current.lastTimestamp = t.timestamp;
      current.ids.push(t.id);
    } else {
      if (current) groups.push(current);
      current = {
        speaker,
        texts: [t.text],
        firstTimestamp: t.timestamp,
        lastTimestamp: t.timestamp,
        ids: [t.id],
        id: t.id,
        isInterim: false,
      };
    }
  }
  if (current) groups.push(current);

  // Append interims as individual entries (faded bubbles)
  for (const t of interims) {
    groups.push({
      speaker: t.speaker || 'Speaker',
      texts: [t.text],
      firstTimestamp: t.timestamp,
      lastTimestamp: t.timestamp,
      ids: [t.id],
      id: t.id,
      isInterim: true,
    });
  }

  return groups;
}

/** Build a human-readable Markdown document from the current session. */
function buildTranscriptMarkdown(transcripts, messages) {
  const hm = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  const finals = (transcripts || []).filter(t => t.isFinal !== false);

  let out = `# Interview Transcript\n\n- **Date:** ${new Date().toLocaleString()}\n\n## Conversation\n\n`;
  if (!finals.length) {
    out += '_No transcript captured._\n\n';
  }
  for (const t of finals) {
    out += `**[${hm(t.timestamp)}] ${t.speaker || 'Speaker'}:** ${t.text}\n\n`;
  }
  if ((messages || []).length) {
    out += `## AI Answers\n\n`;
    for (const m of messages) {
      out += `**${m.type === 'user' ? 'Question' : 'AI Answer'} (${hm(m.timestamp)}):**\n\n${m.text}\n\n`;
    }
  }
  return out;
}

function LiveTab() {
  const transcripts = useStore(s => s.transcripts);
  const messages = useStore(s => s.messages);
  const addMessage = useStore(s => s.addMessage);
  const clearTranscripts = useStore(s => s.clearTranscripts);
  const clearMessages = useStore(s => s.clearMessages);
  const resumeContext = useStore(s => s.resumeContext);
  const isRecording = useStore(s => s.isRecording);
  const setIsRecording = useStore(s => s.setIsRecording);
  const setSessionStartTime = useStore(s => s.setSessionStartTime);
  const ttsEnabled = useStore(s => s.ttsEnabled);
  const ttsVoice = useStore(s => s.ttsVoice);
  const ttsRate = useStore(s => s.ttsRate);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingQuick, setStreamingQuick] = useState('');
  const [streamingDetailed, setStreamingDetailed] = useState('');
  const [streamPhase, setStreamPhase] = useState('quick');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const handleSpeak = (message) => {
    if (speakingMessageId === message.id) {
      SpeechService.stop();
      setSpeakingMessageId(null);
    } else {
      SpeechService.speak(message.text, {
        voice: ttsVoice,
        rate: ttsRate,
        onStart: () => setSpeakingMessageId(message.id),
        onEnd: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    }
  };

  const transcriptScrollRef = useRef(null);
  const answerScrollRef = useRef(null);
  const streamingQuickRef = useRef('');
  const streamingDetailedRef = useRef('');
  const streamPhaseRef = useRef('quick');
  const throttleTimerRef = useRef(null);
  const messageRefs = useRef(new Map());
  const pendingScrollIdRef = useRef(null);
  const prevRecordingRef = useRef(isRecording);

  // Snapshot live data in refs so the auto-save effect can read latest values
  // without re-subscribing on every transcript chunk.
  const transcriptsRef = useRef(transcripts);
  const messagesRef = useRef(messages);
  useEffect(() => { transcriptsRef.current = transcripts; }, [transcripts]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Auto-save the session to the backend whenever recording stops.
  useEffect(() => {
    const was = prevRecordingRef.current;
    prevRecordingRef.current = isRecording;
    if (!(was && !isRecording)) return; // only on true -> false transition

    const finals = (transcriptsRef.current || []).filter(t => t.isFinal !== false);
    if (finals.length === 0) return;

    fetch('http://localhost:5000/api/transcript/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcripts: transcriptsRef.current,
        messages: messagesRef.current,
        startedAt: finals[0]?.timestamp,
        endedAt: new Date().toISOString(),
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success) toast.success('Transcript saved to history', { duration: 1800 });
      })
      .catch(() => {/* backend may be offline; export still works */});
  }, [isRecording]);

  const handleExport = () => {
    const md = buildTranscriptMarkdown(transcripts, messages);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `interview-${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript exported', { duration: 1500 });
  };

  const handleClear = () => {
    clearTranscripts();
    clearMessages();
    setSelectedTranscript(null);
    toast.success('Cleared — ready for a new interview', { duration: 1800 });
  };

  // Auto-scroll transcript panel to the newest line
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // When a new question is asked, anchor IT to the top of the answer panel so the
  // user reads the answer from its start as it streams (instead of jumping to the end).
  useLayoutEffect(() => {
    const id = pendingScrollIdRef.current;
    if (id == null) return;
    const el = messageRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      pendingScrollIdRef.current = null;
    }
  }, [messages]);

  const handleStartInterview = () => {
    setIsRecording(true);
    setSessionStartTime(Date.now());
    toast.success('Listening...', { duration: 1500 });
  };

  const handleStopInterview = () => {
    setIsRecording(false);
    setSessionStartTime(null);
    toast.success('Stopped', { duration: 1500 });
  };

  // Flush throttled streaming buffers into state (keeps markdown re-parsing in check)
  const flushStreaming = () => {
    setStreamingQuick(streamingQuickRef.current);
    setStreamingDetailed(streamingDetailedRef.current);
    throttleTimerRef.current = null;
  };

  const scheduleFlush = () => {
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(flushStreaming, 60);
    }
  };

  // Shared core: ask a question and stream a two-phase (quick cue + detailed) answer.
  // Used by both the chat input and clicking a transcript line.
  const askQuestion = async (questionText) => {
    const text = (questionText || '').trim();
    if (!text || isStreaming) return;

    if (!resumeContext) {
      toast.error('Upload your resume first');
      return;
    }

    // Snapshot conversation history BEFORE adding the new question
    const history = messages.map((m) => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    pendingScrollIdRef.current = userMessage.id; // anchor this question to the top

    setIsLoading(true);
    setIsStreaming(true);
    setStreamPhase('quick');
    streamPhaseRef.current = 'quick';
    streamingQuickRef.current = '';
    streamingDetailedRef.current = '';
    setStreamingQuick('');
    setStreamingDetailed('');

    try {
      const response = await fetch('http://localhost:5000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, resumeContext, conversationHistory: history }),
      });

      if (!response.ok) throw new Error('Failed to connect to streaming endpoint');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setIsLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.chunk) {
              if (parsed.phase === 'detailed') {
                if (streamPhaseRef.current !== 'detailed') {
                  streamPhaseRef.current = 'detailed';
                  setStreamPhase('detailed');
                }
                streamingDetailedRef.current += parsed.chunk;
              } else {
                streamingQuickRef.current += parsed.chunk;
              }
              scheduleFlush();
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }

      if (throttleTimerRef.current) { clearTimeout(throttleTimerRef.current); throttleTimerRef.current = null; }

      const detailed = streamingDetailedRef.current;
      const quick = streamingQuickRef.current;
      const finalText = detailed || quick;
      if (finalText) {
        addMessage({
          id: Date.now() + 1,
          type: 'assistant',
          text: finalText,
          quick: detailed ? quick : '',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Connection error', { duration: 4000 });
      addMessage({ id: Date.now() + 2, type: 'assistant', text: `Error: ${error.message}`, timestamp: new Date().toISOString() });
      setIsLoading(false);
    } finally {
      if (throttleTimerRef.current) { clearTimeout(throttleTimerRef.current); throttleTimerRef.current = null; }
      streamingQuickRef.current = '';
      streamingDetailedRef.current = '';
      streamPhaseRef.current = 'quick';
      setIsStreaming(false);
      setStreamingQuick('');
      setStreamingDetailed('');
    }
  };

  const handleTranscriptClick = (group) => {
    setSelectedTranscript(group.id);
    askQuestion(group.texts.join(' '));
  };

  const handleSend = () => {
    if (!input.trim() || isLoading || isStreaming) return;
    const q = input;
    setInput('');
    askQuestion(q);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const grouped = groupTranscripts(transcripts);

  const isMe = (speaker) => {
    const s = (speaker || '').toLowerCase();
    return s === 'me' || s === 'speaker 1';
  };

  return (
    <div className="split-panel-container">
      {/* ====== TOP PANEL: Chat-style Transcript ====== */}
      <div className="split-panel-top p-0 overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
            Transcript
          </span>
          <div className="flex items-center space-x-1.5">
          {transcripts.length > 0 && (
            <>
              <button
                onClick={handleExport}
                title="Export transcript (.md)"
                className="btn-sm flex items-center space-x-1 bg-white/[0.04] text-white/60 border-white/10 hover:text-white/90"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
              <button
                onClick={handleClear}
                title="Clear transcript & answers"
                className="btn-sm flex items-center bg-white/[0.04] text-white/50 border-white/10 hover:text-red-300"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={isRecording ? handleStopInterview : handleStartInterview}
            className={`btn-sm flex items-center space-x-1.5 ${
              isRecording
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-green-500/20 text-green-300 border-green-500/30'
            }`}
          >
            {isRecording ? (
              <><Square className="w-3 h-3" /><span>Stop</span></>
            ) : (
              <><Play className="w-3 h-3" /><span>Start</span></>
            )}
          </button>
          </div>
        </div>

        {/* Chat-Style Transcript */}
        <div
          ref={transcriptScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-1.5"
        >
          {grouped.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/30 text-xs text-center px-4">
                {isRecording ? 'Listening for speech...' : 'Press Start to begin transcribing'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {grouped.map((group, index) => {
                const me = isMe(group.speaker);
                const interim = group.isInterim;
                return (
                  <motion.div
                    key={interim ? `interim-${group.speaker}` : (group.id || index)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className={`flex ${me ? 'justify-end' : 'justify-start'}`}
                    onClick={() => !interim && handleTranscriptClick(group)}
                  >
                    <div className={`${me ? 'chat-bubble-me' : 'chat-bubble-interviewer'} ${
                      interim ? 'chat-bubble-interim' : ''
                    } ${selectedTranscript === group.id ? 'ring-1 ring-purple-400/40' : ''}`}>
                      {/* Speaker + Timestamp */}
                      <div className="flex items-center justify-between gap-3 mb-0.5">
                        <div className="flex items-center gap-1">
                          {me ? (
                            <User className="w-2.5 h-2.5 text-purple-400/60" />
                          ) : (
                            <Monitor className="w-2.5 h-2.5 text-blue-400/60" />
                          )}
                          <span className="chat-speaker">{group.speaker}</span>
                          {interim && <span className="text-[8px] text-white/30 italic ml-1">typing...</span>}
                        </div>
                        <span className="chat-timestamp">
                          {new Date(group.firstTimestamp).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {/* Combined text */}
                      <p className="chat-text">
                        {group.texts.join(' ')}
                        {interim && <span className="inline-block w-1 h-2.5 bg-purple-400 ml-0.5 animate-pulse rounded-sm"></span>}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {transcripts.length > 0 && (
          <div className="px-3 py-1 border-t border-white/5 flex items-center justify-center">
            <ChevronDown className="w-3 h-3 text-white/20 mr-1" />
            <span className="text-white/20 text-[10px]">Click any message for AI answer</span>
          </div>
        )}
      </div>

      {/* ====== DIVIDER ====== */}
      <div className="split-panel-divider" />

      {/* ====== BOTTOM PANEL: AI Answers + Chat ====== */}
      <div className="split-panel-bottom p-0 overflow-hidden">
        {/* Panel Header */}
        <div className="px-3 py-2 border-b border-white/5">
          <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
            AI Answer
          </span>
        </div>

        {/* Messages Area */}
        <div
          ref={answerScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2"
        >
          {messages.length === 0 && !isStreaming ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-white/30 text-xs">
                  Click a transcript line or type a question below
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  ref={(el) => {
                    if (el) messageRefs.current.set(message.id, el);
                    else messageRefs.current.delete(message.id);
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.type === 'user' ? 'user-bubble' : 'answer-bubble'}`}>
                    {message.type === 'assistant' && message.quick && (
                      <div className="quick-take mb-1.5">
                        <span className="quick-take-label">Quick take</span>
                        <ReactMarkdown
                          className="text-[11px] leading-snug text-purple-100/90 prose prose-invert max-w-none prose-p:my-0.5"
                          components={markdownComponents}
                        >
                          {message.quick}
                        </ReactMarkdown>
                      </div>
                    )}
                    <ReactMarkdown
                      className="text-xs leading-relaxed prose prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5"
                      components={markdownComponents}
                    >
                      {message.text}
                    </ReactMarkdown>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] opacity-40">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.type === 'assistant' && SpeechService.isSupported() && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSpeak(message); }}
                          className={`p-0.5 rounded transition-colors ${
                            speakingMessageId === message.id
                              ? 'text-purple-300 bg-purple-500/20'
                              : 'text-white/20 hover:text-white/50'
                          }`}
                          title={speakingMessageId === message.id ? 'Stop speaking' : 'Read aloud'}
                        >
                          {speakingMessageId === message.id ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Streaming message: quick cue first, then the detailed answer */}
              {isStreaming && (streamingQuick || streamingDetailed) && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="max-w-[85%] answer-bubble">
                    {streamingQuick && (
                      <div className="quick-take mb-1.5">
                        <span className="quick-take-label">Quick take</span>
                        <ReactMarkdown
                          className="text-[11px] leading-snug text-purple-100/90 prose prose-invert max-w-none prose-p:my-0.5"
                          components={markdownComponents}
                        >
                          {streamingQuick}
                        </ReactMarkdown>
                        {streamPhase === 'quick' && (
                          <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse rounded-sm align-middle"></span>
                        )}
                      </div>
                    )}
                    {streamingDetailed && (
                      <ReactMarkdown className="text-xs leading-relaxed prose prose-invert max-w-none prose-p:my-1" components={markdownComponents}>
                        {streamingDetailed}
                      </ReactMarkdown>
                    )}
                    {streamPhase === 'detailed' && streamingDetailed && (
                      <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse rounded-sm align-middle"></span>
                    )}
                    {streamPhase === 'detailed' && !streamingDetailed && (
                      <span className="text-[10px] text-white/40 italic">composing detailed answer…</span>
                    )}
                  </div>
                </motion.div>
              )}

              {isStreaming && !streamingQuick && !streamingDetailed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="answer-bubble p-3 flex items-center gap-2">
                    <Loader className="w-4 h-4 text-purple-300 animate-spin" />
                    <span className="text-[10px] text-white/40">Thinking…</span>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="px-2 py-2 border-t border-white/5 flex items-center space-x-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="flex-1 input-sm bg-white/[0.03]"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiveTab;
