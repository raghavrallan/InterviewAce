import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Resume state
  resume: null,
  resumeContext: '',
  resumeSummary: '',

  setResume: (resume) => set({ resume }),
  setResumeContext: (context) => set({ resumeContext: context }),
  setResumeSummary: (summary) => set({ resumeSummary: summary }),

  // Transcripts
  transcripts: [],
  addTranscript: (transcript) =>
    set((state) => ({
      transcripts: [...state.transcripts, transcript]
    })),
  clearTranscripts: () => set({ transcripts: [] }),

  // Chat messages
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),
  clearMessages: () => set({ messages: [] }),

  // Visibility mode
  visibilityMode: 'normal',
  setVisibilityMode: (mode) => set({ visibilityMode: mode }),

  // Active tab
  activeTab: 'live',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Recording state (global - persists across tabs)
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),

  // Session timer
  sessionStartTime: null,
  setSessionStartTime: (time) => set({ sessionStartTime: time }),

  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Audio device settings
  audioInputDevice: null,
  audioOutputDevice: null,
  setAudioInputDevice: (deviceId) => set({ audioInputDevice: deviceId }),
  setAudioOutputDevice: (deviceId) => set({ audioOutputDevice: deviceId }),

  // Company prep
  selectedCompany: null,
  companyTips: null,
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  setCompanyTips: (tips) => set({ companyTips: tips }),
}));

export default useStore;
