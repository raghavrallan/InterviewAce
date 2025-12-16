import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Mic } from 'lucide-react';
import useStore from './store/useStore';
import Header from './components/Header';
import TabBar from './components/TabBar';
import TranscriptTab from './pages/TranscriptTab';
import ChatTab from './pages/ChatTab';
import PracticeTab from './pages/PracticeTab';
import ResumeTab from './pages/ResumeTab';
import SettingsTab from './pages/SettingsTab';
import WebSpeechSTT from './components/WebSpeechSTT';
import useAudioCapture from './hooks/useAudioCapture';

function App() {
  const { activeTab, visibilityMode, isRecording, addTranscript } = useStore();
  const { hasPermission } = useAudioCapture(isRecording);

  const handleNewTranscript = (transcript) => {
    addTranscript(transcript);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'transcript':
        return <TranscriptTab />;
      case 'chat':
        return <ChatTab />;
      case 'practice':
        return <PracticeTab />;
      case 'resume':
        return <ResumeTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <TranscriptTab />;
    }
  };

  return (
    <div
      className={`w-screen h-screen gradient-bg overflow-hidden visibility-${visibilityMode}`}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: 'rgba(20, 20, 30, 0.95)',
            color: '#e0e0e0',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '13px'
          },
        }}
      />

      <div className="w-full h-full flex flex-col p-3">
        {/* Header with drag handle */}
        <Header />

        {/* Tab Navigation */}
        <TabBar />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden mt-3">
          {renderActiveTab()}
        </div>

        {/* Global Recording Indicator */}
        {isRecording && (
          <div className="fixed bottom-4 right-4 glass-panel-dark px-4 py-2 rounded-full flex items-center space-x-2 animate-pulse">
            <Mic className="w-4 h-4 text-red-400" />
            <span className="text-white text-xs font-semibold">Recording...</span>
          </div>
        )}
      </div>

      {/* Global Speech Recognition - works across all tabs */}
      <WebSpeechSTT isRecording={isRecording} onTranscript={handleNewTranscript} />
    </div>
  );
}

export default App;
