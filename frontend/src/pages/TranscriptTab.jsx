import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

function TranscriptTab() {
  const { transcripts, setActiveTab, addMessage, resumeContext, isRecording, setIsRecording } = useStore();
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleStartInterview = async () => {
    setIsRecording(true);
    toast.success('Interview started! Listening...');
  };

  const handleStopInterview = () => {
    setIsRecording(false);
    toast.success('Interview stopped');
  };

  const handleTranscriptClick = async (transcript) => {
    setSelectedTranscript(transcript);

    if (!resumeContext) {
      toast.error('Please upload your resume first!');
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
        // Add to chat messages
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

        // Switch to chat tab
        setActiveTab('chat');
        toast.success('Answer generated! Check Chat tab');
      } else {
        // Show detailed error message from backend
        const errorMessage = data.error || 'Failed to generate answer';
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            maxWidth: '500px',
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = error.message || 'Failed to generate answer. Please check your connection.';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="glass-panel h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">Live Transcript</h2>

        <button
          onClick={isRecording ? handleStopInterview : handleStartInterview}
          className={`glass-button flex items-center space-x-2 ${
            isRecording ? 'bg-red-500/30 glow' : ''
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 text-white" />
              <span className="text-white text-sm">Stop</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-white" />
              <span className="text-white text-sm">Start</span>
            </>
          )}
        </button>
      </div>

      {/* Transcripts List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-3"
      >
        <AnimatePresence>
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/50 text-sm">
              Click "Start" to begin transcribing...
            </div>
          ) : (
            transcripts.map((transcript, index) => (
              <motion.div
                key={transcript.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => handleTranscriptClick(transcript)}
                className={`p-3 glass-panel-dark rounded-xl cursor-pointer hover:bg-white/10 transition-all ${
                  selectedTranscript?.id === transcript.id ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-purple-300 text-xs font-semibold">
                    {transcript.speaker || 'Interviewer'}
                  </span>
                  <span className="text-white/40 text-xs">
                    {new Date(transcript.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {transcript.text}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {transcripts.length > 0 && (
        <div className="mt-4 text-white/40 text-xs text-center">
          Click any transcript to generate an answer
        </div>
      )}
    </div>
  );
}

export default TranscriptTab;
