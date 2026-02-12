import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import CommandBar from './components/CommandBar';
import LiveTab from './pages/LiveTab';
import PracticeTab from './pages/PracticeTab';
import ResumeTab from './pages/ResumeTab';
import SettingsTab from './pages/SettingsTab';
import WhisperSTT from './components/WhisperSTT';

function App() {
  const { activeTab, isRecording, addTranscript } = useStore();

  const handleNewTranscript = (transcript) => {
    addTranscript(transcript);
  };

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

      {/* Global Speech Recognition */}
      <WhisperSTT isRecording={isRecording} onTranscript={handleNewTranscript} />
    </div>
  );
}

export default App;
