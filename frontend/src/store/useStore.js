import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Resume state
  resume: null,
  resumeContext: '',
  resumeSummary: '',

  setResume: (resume) => set({ resume }),
  setResumeContext: (context) => set({ resumeContext: context }),
  setResumeSummary: (summary) => set({ resumeSummary: summary }),

  // Transcripts (supports interim: isFinal=false entries are replaced/removed on next update)
  transcripts: [],
  addTranscript: (transcript) =>
    set((state) => {
      if (transcript.isFinal) {
        // Final transcript: remove any interim for same speaker pattern, then append
        const filtered = state.transcripts.filter(t =>
          !(t.isFinal === false && t.speaker === transcript.speaker)
        );
        return { transcripts: [...filtered, transcript] };
      }
      // Interim transcript: replace existing interim for this speaker, or append
      const idx = state.transcripts.findIndex(t =>
        t.isFinal === false && t.speaker === transcript.speaker
      );
      if (idx >= 0) {
        const updated = [...state.transcripts];
        updated[idx] = transcript;
        return { transcripts: updated };
      }
      return { transcripts: [...state.transcripts, transcript] };
    }),
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

  // STT provider: 'deepgram' (real-time WebSocket) or 'whisper' (3s chunk upload)
  sttProvider: 'deepgram',
  setSttProvider: (provider) => set({ sttProvider: provider }),

  // Audio capture mode: 'dual' (mic + system audio, recommended) or 'diarization' (single mic + AI speaker detection)
  captureMode: 'dual',
  setCaptureMode: (mode) => set({ captureMode: mode }),

  // Speaker label mapping: { speakerId: label }
  // In diarization mode: 0 = Interviewer, 1 = Me
  // Customizable in settings
  speakerMap: { 0: 'Interviewer', 1: 'Me' },
  setSpeakerMap: (map) => set({ speakerMap: map }),

  // Meeting platform detection
  detectedPlatform: null,
  setDetectedPlatform: (platform) => set({ detectedPlatform: platform }),
  autoStartOnMeeting: false,
  setAutoStartOnMeeting: (enabled) => set({ autoStartOnMeeting: enabled }),

  // TTS settings
  ttsEnabled: false,
  ttsVoice: null,
  ttsRate: 1.0,
  setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
  setTtsVoice: (voice) => set({ ttsVoice: voice }),
  setTtsRate: (rate) => set({ ttsRate: rate }),
}));

export default useStore;
