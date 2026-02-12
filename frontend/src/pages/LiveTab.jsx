import { useState, useRef, useEffect } from 'react';
import { Play, Square, Send, Loader, ChevronDown, Volume2, VolumeX } from 'lucide-react';
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

function LiveTab() {
  const {
    transcripts,
    messages,
    addMessage,
    resumeContext,
    isRecording,
    setIsRecording,
    setSessionStartTime,
    ttsEnabled,
    ttsVoice,
    ttsRate
  } = useStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const handleSpeak = (message) => {
    if (speakingMessageId === message.id) {
      // Stop speaking
      SpeechService.stop();
      setSpeakingMessageId(null);
    } else {
      // Speak this message
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
  const streamingMessageIdRef = useRef(null);

  // Auto-scroll transcript panel
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Auto-scroll answer panel
  useEffect(() => {
    if (answerScrollRef.current) {
      answerScrollRef.current.scrollTop = answerScrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

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

  // Handle clicking a transcript to generate an answer
  const handleTranscriptClick = async (transcript) => {
    setSelectedTranscript(transcript);

    if (!resumeContext) {
      toast.error('Upload your resume first');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/chat/answer-from-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: transcript.text,
          resumeContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addMessage({
          id: Date.now(),
          type: 'user',
          text: transcript.text,
          timestamp: new Date().toISOString(),
        });

        addMessage({
          id: Date.now() + 1,
          type: 'assistant',
          text: data.data.answer,
          timestamp: new Date().toISOString(),
        });
      } else {
        toast.error(data.error || 'Failed to generate answer', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection error');
    }
  };

  // Handle sending a chat message with streaming
  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    if (!resumeContext) {
      toast.error('Upload your resume first');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');
    streamingMessageIdRef.current = Date.now();

    try {
      const response = await fetch('http://localhost:5000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentInput,
          resumeContext,
          conversationHistory: messages.map((m) => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to streaming endpoint');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      setIsLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                fullText += parsed.chunk;
                setStreamingText(fullText);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) {
                throw e;
              }
            }
          }
        }
      }

      if (fullText) {
        addMessage({
          id: streamingMessageIdRef.current,
          type: 'assistant',
          text: fullText,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Connection error', { duration: 4000 });
      addMessage({
        id: Date.now(),
        type: 'assistant',
        text: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      setIsLoading(false);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      streamingMessageIdRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="split-panel-container">
      {/* ====== TOP PANEL: Transcript ====== */}
      <div className="split-panel-top p-0 overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
            Transcript
          </span>
          <button
            onClick={isRecording ? handleStopInterview : handleStartInterview}
            className={`btn-sm flex items-center space-x-1.5 ${
              isRecording
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-green-500/20 text-green-300 border-green-500/30'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Start</span>
              </>
            )}
          </button>
        </div>

        {/* Transcript Items */}
        <div
          ref={transcriptScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1.5 space-y-1"
        >
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/30 text-xs text-center px-4">
                {isRecording
                  ? 'Listening for speech...'
                  : 'Press Start to begin transcribing'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {transcripts.map((transcript, index) => (
                <motion.div
                  key={transcript.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleTranscriptClick(transcript)}
                  className={`transcript-item ${
                    selectedTranscript?.id === transcript.id ? 'selected' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-purple-400/80 text-[10px] font-medium">
                      {transcript.speaker || 'Speaker'}
                    </span>
                    <span className="text-white/25 text-[10px]">
                      {new Date(transcript.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed">
                    {transcript.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {transcripts.length > 0 && (
          <div className="px-3 py-1 border-t border-white/5 flex items-center justify-center">
            <ChevronDown className="w-3 h-3 text-white/20 mr-1" />
            <span className="text-white/20 text-[10px]">Click any line for AI answer</span>
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.type === 'user' ? 'user-bubble' : 'answer-bubble'
                    }`}
                  >
                    <ReactMarkdown
                      className="text-xs leading-relaxed prose prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5"
                      components={markdownComponents}
                    >
                      {message.text}
                    </ReactMarkdown>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] opacity-40">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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

              {/* Streaming message */}
              {isStreaming && streamingText && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] answer-bubble">
                    <ReactMarkdown
                      className="text-xs leading-relaxed prose prose-invert max-w-none prose-p:my-1"
                      components={markdownComponents}
                    >
                      {streamingText}
                    </ReactMarkdown>
                    <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse rounded-sm"></span>
                  </div>
                </motion.div>
              )}

              {isLoading && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="answer-bubble p-3">
                    <Loader className="w-4 h-4 text-purple-300 animate-spin" />
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
