import { useState, useEffect, useRef } from 'react';
import { Play, Square, Sparkles, Target, TrendingUp, Star, Building2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import STARMethodGuide from '../components/STARMethodGuide';

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

function CollapsibleSection({ title, icon: Icon, iconColor = 'text-purple-300', children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-panel-dark rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="collapsible-header w-full"
      >
        <div className="flex items-center space-x-2">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className="text-white text-xs font-medium">{title}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 collapsible-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PracticeTab() {
  const { resumeContext, isRecording, setIsRecording, selectedCompany } = useStore();
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [questionType, setQuestionType] = useState('behavioral');
  const [difficulty, setDifficulty] = useState('medium');
  const [speechMetrics, setSpeechMetrics] = useState({
    fillerWords: 0,
    wordsPerMinute: 0,
    duration: 0,
    clarity: 0
  });
  const startTimeRef = useRef(null);
  const wordCountRef = useRef(0);

  const generateQuestion = async () => {
    if (!resumeContext) {
      toast.error('Upload your resume first');
      return;
    }

    setIsGenerating(true);
    try {
      let response, data;

      if (selectedCompany) {
        response = await fetch(`http://localhost:5000/api/company/${selectedCompany.id}/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeText: resumeContext,
            questionType,
            count: 1
          }),
        });

        data = await response.json();

        if (data.success && data.data.questions && data.data.questions.length > 0) {
          const companyQuestion = data.data.questions[0];
          setCurrentQuestion({
            id: Date.now(),
            question: companyQuestion.question,
            type: companyQuestion.category,
            difficulty: companyQuestion.difficulty,
            hints: [],
            expectedFramework: 'STAR',
            company: selectedCompany.name,
            focusArea: companyQuestion.focusArea,
            explanation: companyQuestion.explanation
          });
          setUserAnswer('');
          setFeedback(null);
          setSpeechMetrics({ fillerWords: 0, wordsPerMinute: 0, duration: 0, clarity: 0 });
          toast.success(`${selectedCompany.name} question ready`);
        } else {
          toast.error(data.error || 'Failed to generate question');
        }
      } else {
        response = await fetch('http://localhost:5000/api/practice/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeContext,
            questionType,
            difficulty,
            previousQuestions: practiceHistory.map(q => q.question)
          }),
        });

        data = await response.json();

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
          toast.success('Question ready');
        } else {
          toast.error(data.error || 'Failed to generate question');
        }
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
  };

  const analyzeSpeech = (text) => {
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally'];
    const fillerCount = fillerWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (text.match(regex) || []).length;
    }, 0);

    const wordCount = text.trim().split(/\s+/).length;
    wordCountRef.current = wordCount;

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
        analyzeSpeech(userAnswer);
        toast.success('Answer evaluated');
      } else {
        toast.error(data.error || 'Failed to evaluate');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to evaluate answer');
    }
  };

  useEffect(() => {
    if (userAnswer) {
      analyzeSpeech(userAnswer);
    }
  }, [userAnswer]);

  return (
    <div className="h-full flex flex-col p-0 overflow-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Practice</span>
          {selectedCompany && (
            <span className="text-purple-300/70 text-[10px] flex items-center space-x-1">
              <Building2 className="w-2.5 h-2.5" />
              <span>{selectedCompany.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="input-sm py-0.5 px-1.5 bg-white/[0.03]"
          >
            <option value="behavioral">Behavioral</option>
            <option value="technical">Technical</option>
            <option value="situational">Situational</option>
          </select>
          <button
            onClick={generateQuestion}
            disabled={isGenerating}
            className="btn-sm bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
          >
            {isGenerating ? '...' : 'New Q'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-2 space-y-2">
        {/* Current Question */}
        {currentQuestion ? (
          <>
            {/* Question Card */}
            <div className="glass-panel-dark p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  <span className="text-purple-300/80 text-[10px] font-semibold uppercase">
                    {currentQuestion.type} - {currentQuestion.difficulty}
                  </span>
                </div>
                {currentQuestion.expectedFramework && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-300/80 rounded">
                    {currentQuestion.expectedFramework}
                  </span>
                )}
              </div>

              {currentQuestion.company && (
                <div className="mb-2 p-2 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <Building2 className="w-2.5 h-2.5 text-purple-300" />
                    <span className="text-purple-300/80 text-[10px] font-semibold">
                      {currentQuestion.company}
                    </span>
                  </div>
                  {currentQuestion.focusArea && (
                    <p className="text-white/50 text-[10px]">Focus: {currentQuestion.focusArea}</p>
                  )}
                </div>
              )}

              <p className="text-white text-xs leading-relaxed">{currentQuestion.question}</p>

              {currentQuestion.explanation && (
                <div className="mt-2 p-2 bg-blue-500/5 border border-blue-400/10 rounded">
                  <p className="text-blue-300/70 text-[10px] leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}

              {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-white/30 text-[10px] mb-1">Hints:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {currentQuestion.hints.map((hint, idx) => (
                      <li key={idx} className="text-white/50 text-[10px]">{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* STAR Method Guide - Collapsible */}
            <CollapsibleSection title="STAR Method Guide" icon={Star} iconColor="text-yellow-400">
              <STARMethodGuide />
            </CollapsibleSection>

            {/* Speech Metrics - Collapsible */}
            <CollapsibleSection title="Speech Analysis" icon={TrendingUp} iconColor="text-green-300">
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[9px]">Fillers</p>
                  <p className="text-white text-sm font-semibold">{speechMetrics.fillerWords}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[9px]">WPM</p>
                  <p className="text-white text-sm font-semibold">{speechMetrics.wordsPerMinute}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[9px]">Time</p>
                  <p className="text-white text-sm font-semibold">{speechMetrics.duration}s</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[9px]">Clarity</p>
                  <p className="text-white text-sm font-semibold">{speechMetrics.clarity}%</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Answer Input */}
            <div className="glass-panel-dark p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-[10px] font-semibold uppercase">Your Answer</span>
                <button
                  onClick={isRecording ? stopAnswer : startAnswer}
                  className={`btn-sm flex items-center space-x-1 ${
                    isRecording
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-green-500/20 text-green-300 border-green-500/30'
                  }`}
                >
                  {isRecording ? (
                    <><Square className="w-2.5 h-2.5" /><span>Stop</span></>
                  ) : (
                    <><Play className="w-2.5 h-2.5" /><span>Record</span></>
                  )}
                </button>
              </div>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type or speak your answer..."
                className="w-full input-sm min-h-[80px] resize-none bg-white/[0.03]"
              />
              <button
                onClick={submitAnswer}
                disabled={!userAnswer.trim()}
                className="mt-2 btn-sm w-full bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-30"
              >
                Submit & Get Feedback
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel-dark p-3 rounded-xl"
              >
                <div className="flex items-center space-x-1.5 mb-2">
                  <Target className="w-3 h-3 text-blue-300" />
                  <span className="text-white/60 text-[10px] font-semibold uppercase">AI Feedback</span>
                </div>
                <ReactMarkdown
                  className="text-xs leading-relaxed prose prose-invert max-w-none prose-p:my-1"
                  components={markdownComponents}
                >
                  {feedback}
                </ReactMarkdown>
              </motion.div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <Sparkles className="w-6 h-6 text-purple-400/50 mx-auto mb-2" />
              <p className="text-white/40 text-xs mb-3">
                Practice with AI-generated questions tailored to your resume
              </p>
              <button
                onClick={generateQuestion}
                disabled={isGenerating}
                className="btn-sm bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
              >
                Generate Question
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PracticeTab;
