import { useState, useEffect, useRef } from 'react';
import { Play, Square, Sparkles, Target, Clock, TrendingUp, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import STARMethodGuide from '../components/STARMethodGuide';

function PracticeTab() {
  const { resumeContext, isRecording, setIsRecording } = useStore();
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [questionType, setQuestionType] = useState('behavioral'); // behavioral, technical, situational
  const [difficulty, setDifficulty] = useState('medium');
  const [showSTARGuide, setShowSTARGuide] = useState(false);
  const [speechMetrics, setSpeechMetrics] = useState({
    fillerWords: 0,
    wordsPerMinute: 0,
    duration: 0,
    clarity: 0
  });
  const startTimeRef = useRef(null);
  const wordCountRef = useRef(0);

  const questionTypes = [
    { value: 'behavioral', label: 'Behavioral', icon: Target, color: 'purple' },
    { value: 'technical', label: 'Technical', icon: Sparkles, color: 'blue' },
    { value: 'situational', label: 'Situational', icon: TrendingUp, color: 'green' }
  ];

  const generateQuestion = async () => {
    if (!resumeContext) {
      toast.error('Please upload your resume first!');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/practice/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContext,
          questionType,
          difficulty,
          previousQuestions: practiceHistory.map(q => q.question)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentQuestion({
          id: Date.now(),
          question: data.data.question,
          type: questionType,
          difficulty: difficulty,
          hints: data.data.hints || [],
          expectedFramework: data.data.framework || 'STAR'
        });
        setUserAnswer('');
        setFeedback(null);
        setSpeechMetrics({ fillerWords: 0, wordsPerMinute: 0, duration: 0, clarity: 0 });
        toast.success('New practice question generated!');
      } else {
        toast.error(data.error || 'Failed to generate question');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate question');
    } finally {
      setIsGenerating(false);
    }
  };

  const startAnswer = () => {
    setIsRecording(true);
    startTimeRef.current = Date.now();
    wordCountRef.current = 0;
    toast.success('Recording started!');
  };

  const stopAnswer = () => {
    setIsRecording(false);
    const duration = (Date.now() - startTimeRef.current) / 1000;
    const wpm = Math.round((wordCountRef.current / duration) * 60);

    setSpeechMetrics(prev => ({
      ...prev,
      duration: Math.round(duration),
      wordsPerMinute: wpm
    }));

    toast.success('Recording stopped!');
  };

  const analyzeSpeech = (text) => {
    // Analyze filler words
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally'];
    const fillerCount = fillerWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (text.match(regex) || []).length;
    }, 0);

    // Count words
    const wordCount = text.trim().split(/\s+/).length;
    wordCountRef.current = wordCount;

    // Calculate clarity score (based on filler word ratio)
    const clarity = Math.max(0, Math.min(100, 100 - (fillerCount / wordCount * 100) * 10));

    setSpeechMetrics(prev => ({
      ...prev,
      fillerWords: fillerCount,
      clarity: Math.round(clarity)
    }));
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    try {
      const response = await fetch('http://localhost:5000/api/practice/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: userAnswer,
          resumeContext,
          questionType,
          expectedFramework: currentQuestion.expectedFramework,
          speechMetrics
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedback(data.data.feedback);
        setPracticeHistory(prev => [...prev, {
          ...currentQuestion,
          answer: userAnswer,
          feedback: data.data.feedback,
          metrics: speechMetrics,
          timestamp: new Date().toISOString()
        }]);

        // Analyze speech patterns
        analyzeSpeech(userAnswer);

        toast.success('Answer evaluated!');
      } else {
        toast.error(data.error || 'Failed to evaluate answer');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to evaluate answer');
    }
  };

  useEffect(() => {
    // Analyze speech in real-time as user types
    if (userAnswer) {
      analyzeSpeech(userAnswer);
    }
  }, [userAnswer]);

  return (
    <div className="glass-panel h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">Practice Interview</h2>
        <div className="flex items-center space-x-2">
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="glass-input text-xs py-1 px-2"
          >
            {questionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <button
            onClick={generateQuestion}
            disabled={isGenerating}
            className="glass-button text-xs px-3 py-1"
          >
            {isGenerating ? 'Generating...' : 'New Question'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {/* STAR Method Guide Toggle */}
        {currentQuestion && (
          <button
            onClick={() => setShowSTARGuide(!showSTARGuide)}
            className="glass-button text-xs px-3 py-2 w-full flex items-center justify-center space-x-2"
          >
            <Star className="w-3 h-3" />
            <span>{showSTARGuide ? 'Hide' : 'Show'} STAR Method Guide</span>
          </button>
        )}

        {/* STAR Method Guide */}
        {showSTARGuide && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <STARMethodGuide />
          </motion.div>
        )}

        {/* Current Question */}
        {currentQuestion && (
          <div className="glass-panel-dark p-4 rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span className="text-purple-300 text-xs font-semibold uppercase">
                  {currentQuestion.type} - {currentQuestion.difficulty}
                </span>
              </div>
              {currentQuestion.expectedFramework && (
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                  Use {currentQuestion.expectedFramework} Method
                </span>
              )}
            </div>
            <p className="text-white text-sm leading-relaxed mb-3">
              {currentQuestion.question}
            </p>
            {currentQuestion.hints && currentQuestion.hints.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-gray-400 text-xs mb-2">💡 Hints:</p>
                <ul className="list-disc list-inside space-y-1">
                  {currentQuestion.hints.map((hint, idx) => (
                    <li key={idx} className="text-gray-300 text-xs">{hint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Speech Metrics */}
        {currentQuestion && (
          <div className="glass-panel-dark p-3 rounded-xl">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <span className="text-white text-xs font-semibold">Speech Analysis</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded p-2">
                <p className="text-gray-400 text-xs">Filler Words</p>
                <p className="text-white text-lg font-semibold">{speechMetrics.fillerWords}</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <p className="text-gray-400 text-xs">Words/Min</p>
                <p className="text-white text-lg font-semibold">{speechMetrics.wordsPerMinute}</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <p className="text-gray-400 text-xs">Duration</p>
                <p className="text-white text-lg font-semibold">{speechMetrics.duration}s</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <p className="text-gray-400 text-xs">Clarity</p>
                <p className="text-white text-lg font-semibold">{speechMetrics.clarity}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Answer Input */}
        {currentQuestion && (
          <div className="glass-panel-dark p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-xs font-semibold">Your Answer</span>
              <button
                onClick={isRecording ? stopAnswer : startAnswer}
                className={`flex items-center space-x-2 text-xs px-3 py-1 rounded-lg ${
                  isRecording ? 'bg-red-500/30 text-red-200' : 'bg-green-500/30 text-green-200'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3 h-3" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Start Recording</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type or speak your answer here..."
              className="w-full glass-input min-h-[120px] text-sm"
            />
            <button
              onClick={submitAnswer}
              disabled={!userAnswer.trim()}
              className="mt-3 glass-button w-full disabled:opacity-50"
            >
              Submit & Get Feedback
            </button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel-dark p-4 rounded-xl"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Target className="w-4 h-4 text-blue-300" />
              <span className="text-white text-xs font-semibold">AI Feedback</span>
            </div>
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
              {feedback}
            </ReactMarkdown>
          </motion.div>
        )}

        {/* Empty State */}
        {!currentQuestion && (
          <div className="flex items-center justify-center h-full">
            <div className="glass-panel-dark p-6 rounded-2xl max-w-sm text-center">
              <Sparkles className="w-8 h-8 text-purple-300 mx-auto mb-3" />
              <p className="text-white/70 text-sm leading-relaxed">
                Start practicing with AI-generated interview questions tailored to your resume!
              </p>
              <button
                onClick={generateQuestion}
                disabled={isGenerating}
                className="glass-button mt-4 w-full"
              >
                Generate First Question
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PracticeTab;
