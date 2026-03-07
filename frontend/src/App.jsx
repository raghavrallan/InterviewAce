import { useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import CommandBar from './components/CommandBar';
import LiveTab from './pages/LiveTab';
import PracticeTab from './pages/PracticeTab';
import ResumeTab from './pages/ResumeTab';
import SettingsTab from './pages/SettingsTab';
import WhisperSTT from './components/WhisperSTT';
import DeepgramSTT from './components/DeepgramSTT';
import DualStreamSTT from './components/DualStreamSTT';

function App() {
  const { activeTab, isRecording, addTranscript, sttProvider, captureMode } = useStore();

  // Memoize to prevent re-render loops in STT components
  const handleNewTranscript = useCallback((transcript) => {
    addTranscript(transcript);
  }, [addTranscript]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'live':
        return <LiveTab />;
      case 'practice':
        return <PracticeTab />;
      case 'resume':
        return <ResumeTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <LiveTab />;
    }
  };

  // Render the appropriate STT component based on provider and capture mode
  const renderSTT = () => {
    if (sttProvider === 'whisper') {
      return <WhisperSTT isRecording={isRecording} onTranscript={handleNewTranscript} />;
    }

    // Deepgram provider: route based on capture mode
    if (captureMode === 'dual') {
      return <DualStreamSTT isRecording={isRecording} onTranscript={handleNewTranscript} />;
    }

    // Default: diarization mode
    return <DeepgramSTT isRecording={isRecording} onTranscript={handleNewTranscript} />;
  };

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: 'rgba(16, 16, 20, 0.95)',
            color: '#e0e0e0',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '11px',
            padding: '6px 12px',
            borderRadius: '50px',
          },
        }}
      />

      <div className="w-full h-full flex flex-col p-3" style={{ background: 'transparent' }}>
        {/* Floating Command Bar */}
        <CommandBar />

        {/* Content Card */}
        <div className="content-card flex-1 mt-2 overflow-hidden">
          {renderActiveTab()}
        </div>
      </div>

      {/* Global Speech Recognition - provider + mode switchable */}
      {renderSTT()}
    </div>
  );
}

export default App;
