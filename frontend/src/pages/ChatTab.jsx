import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

function ChatTab() {
  const { messages, addMessage, resumeContext } = useStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);
  const streamingMessageIdRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    if (!resumeContext) {
      toast.error('Please upload your resume first!');
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
      // Use streaming endpoint for real-time responses
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

      setIsLoading(false); // Stop loading spinner, start streaming

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
              // Ignore JSON parse errors for incomplete chunks
              if (e.message && !e.message.includes('JSON')) {
                throw e;
              }
            }
          }
        }
      }

      // Add the complete message
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
      const errorMsg = error.message || 'Failed to send message. Please check your connection.';
      toast.error(errorMsg, {
        duration: 5000,
        style: { maxWidth: '500px' }
      });

      // Add error as a message for context
      addMessage({
        id: Date.now(),
        type: 'assistant',
        text: `Error: ${errorMsg}`,
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
    <div className="glass-panel h-full flex flex-col p-4">
      <h2 className="text-white font-semibold text-lg mb-4">AI Chat Assistant</h2>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-4"
      >
        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="glass-panel-dark p-6 rounded-2xl max-w-sm">
                <p className="text-white/70 text-sm leading-relaxed">
                  Ask me anything! I'll help you prepare answers based on your resume.
                </p>
                <p className="text-white/50 text-xs mt-3">
                  Or click any transcript to get instant answers
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'glass-panel-dark text-white'
                  }`}
                >
                  <ReactMarkdown
                    className="text-sm leading-relaxed prose prose-invert max-w-none"
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-lg my-2"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-purple-900/30 px-1.5 py-0.5 rounded text-purple-200" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                  <span className="text-xs opacity-60 mt-2 block">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] p-3 rounded-2xl glass-panel-dark text-white">
              <ReactMarkdown
                className="text-sm leading-relaxed prose prose-invert max-w-none"
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg my-2"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-purple-900/30 px-1.5 py-0.5 rounded text-purple-200" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {streamingText}
              </ReactMarkdown>
              <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse"></span>
            </div>
          </motion.div>
        )}

        {isLoading && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="glass-panel-dark p-3 rounded-2xl">
              <Loader className="w-5 h-5 text-purple-300 animate-spin" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question..."
          className="flex-1 glass-input"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="glass-button p-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

export default ChatTab;
