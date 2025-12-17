# 🎯 InterviewAce

> AI-powered interview assistant with real-time transcription, intelligent answer generation, and comprehensive practice tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-29.0.0-blue)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue)](https://reactjs.org/)

InterviewAce is a desktop application built with Electron that helps job seekers excel in interviews by providing AI-powered assistance, real-time transcription, practice mode with feedback, and speech analysis.

## ✨ Features

### 🎧 Dual Audio Capture **(✅ NEW - Phase 1)**
- **Simultaneous capture** of system audio (interviewer) + microphone (you)
- Powered by `electron-audio-loopback` for local-only processing
- Real-time audio level indicators for both sources
- Visual progress bars showing audio activity
- Smart fallback to standard methods if loopback unavailable
- No cloud dependencies - 100% local processing

### 🌐 Multi-Language Support **(✅ NEW - 11 Languages)**
- **11 languages** with full speech recognition support:
  - 🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German
  - 🇨🇳 Chinese | 🇯🇵 Japanese | 🇰🇷 Korean | 🇮🇳 Hindi
  - 🇧🇷 Portuguese | 🇸🇦 Arabic | 🇷🇺 Russian
- Instant language switching in Settings
- AI responses in your selected language
- Web Speech API auto-adapts to language
- Browser language detection with localStorage persistence

### 📹 Video Platform Integration **(✅ NEW - Auto-Detection)**
- **Auto-detects** Zoom, Microsoft Teams, Google Meet, Webex, Skype
- Monitors every 5 seconds for active meetings
- **Auto-activation**: Switches to stealth mode when meeting starts
- Platform-specific visibility recommendations
- In Meeting / No Meeting status indicators
- Platform icons and optimization tips
- Toggle auto-activation on/off in Settings

### 📄 Job Description Integration **(✅ NEW - Complete)**
- Upload JD files (PDF, DOCX, TXT) or paste text
- AI-powered parsing extracts:
  - Job title, company, location, experience level
  - Required & preferred skills
  - Responsibilities & qualifications
  - Keywords for matching
- **Skill matching** algorithm compares resume vs JD
- Calculate match percentage (0-100%)
- Identify matched and missing skills with visual indicators
- Color-coded match percentage badges (green/yellow/red)
- Matched skills displayed with green badges
- Missing skills highlighted with orange badges
- Overall assessment and recommendations
- Generate tailored interview questions for the role
- Full frontend UI integration in Resume tab

### 🎤 Real-Time Transcription
- Live speech-to-text using Web Speech API
- Continuous recording across all tabs
- Automatic speaker detection
- Timestamp tracking
- Click on any transcript to get AI-generated answers

### 🤖 AI-Powered Assistance
- Context-aware answers based on your resume
- Support for behavioral, technical, and situational questions
- ChatGPT-style streaming responses
- Code syntax highlighting for technical questions
- Conversation history tracking
- **Multi-language AI responses**

### 🎯 Practice Mode
- AI-generated interview questions tailored to your background
- Three question types: Behavioral, Technical, Situational
- Three difficulty levels: Easy, Medium, Hard
- Comprehensive feedback and scoring system
- Answer evaluation with detailed suggestions

### 📊 Speech Analysis
- Filler word detection (um, uh, like, etc.)
- Words per minute tracking
- Clarity scoring
- Duration measurement
- Real-time feedback on speaking patterns

### 📐 STAR Method Guidance
- Interactive framework guide for behavioral questions
- Structured answer templates (Situation, Task, Action, Result)
- Best practices and timing tips
- Toggle on/off during practice

### 🎨 Modern UI/UX
- Glass morphism design with translucent effects
- Multiple visibility modes (Normal, Stealth, Ghost, Adaptive)
- Overlay mode (hidden from Alt+Tab)
- Smooth animations with Framer Motion
- Centered window with optimal positioning

### 🔧 Customization
- Audio device selection (input/output)
- **Dual audio mode toggle** (system + mic vs mic-only)
- Keyboard shortcuts for quick access
- Adjustable visibility modes
- Custom window opacity
- **Language selector** with 11 languages
- **Video platform auto-activation** toggle

## 🏗️ Architecture

```
InterviewAce/
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Error handling, etc.
│   │   └── utils/     # Utilities
│   └── Dockerfile
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/# Reusable components
│   │   ├── pages/     # Tab pages
│   │   ├── store/     # Zustand state management
│   │   └── styles/    # Tailwind CSS
│   └── Dockerfile
├── electron/          # Electron main process
│   ├── main.js        # Main process with stealth mode
│   └── preload.js     # Preload script
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** & Docker Compose (optional, for containerized deployment)
- **OpenAI API Key** - ✅ Already configured!
- **Modern Browser** - Chrome, Edge, or Safari (for Web Speech API)
- **LiveKit Account** - ⚠️ OPTIONAL (we use free Web Speech API by default)

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd InterviewAce
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Environment is ready!**

   Your `.env` file is already configured with your OpenAI key!

   **Note:** LiveKit is optional. We use Web Speech API (free, built-in) by default.

   If you want to use LiveKit later, update these in `.env`:
   ```env
   LIVEKIT_API_KEY=your-livekit-api-key
   LIVEKIT_API_SECRET=your-livekit-secret
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

4. **Start the application:**

   **Option A: Development Mode**
   ```bash
   npm run dev
   ```

   **Option B: Docker**
   ```bash
   npm run docker:build
   npm run docker:up
   ```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+V` | Cycle Visibility Modes |
| `Ctrl+Shift+S` | Quick Stealth Mode |
| `Ctrl+Shift+G` | Ghost Mode (Nearly Invisible) |
| `Ctrl+Shift+N` | Normal Mode |
| `Ctrl+Shift+H` | Hide/Show Window |
| `Ctrl+Shift+A` | Focus & Normal Mode |

## 📖 How to Use

### 1. Upload Your Resume
- Go to the **Resume** tab
- Drag & drop or click to upload your resume (PDF, DOC, DOCX, TXT)
- Wait for AI to analyze and summarize your resume

### 2. Start Interview
- Switch to the **Transcript** tab
- Click **Start** to begin transcription
- Allow microphone access when prompted
- Speak naturally - browser will transcribe in real-time using Web Speech API
- Works in Chrome, Edge, Safari (not Firefox)

### 3. Get AI Answers
- **Method 1:** Click any transcript line to generate an AI answer
- **Method 2:** Switch to **Chat** tab and type your question directly
- **Method 3:** Use **Practice** tab for mock interviews with feedback
- Answers are based on your resume and sound natural

### 4. Practice Mode **(NEW)**
- Go to the **Practice** tab
- Select question type (Behavioral/Technical/Situational)
- Click **Generate Question** for AI-generated questions
- Record or type your answer
- Submit for comprehensive AI feedback and scoring
- View speech metrics (filler words, pace, clarity)

### 5. Enable Stealth Mode
- Press `Ctrl+Shift+S` for quick stealth mode
- Press `Ctrl+Shift+G` for ghost mode (nearly invisible)
- Press `Ctrl+Shift+N` to restore normal mode
- Press `Ctrl+Shift+V` to cycle through all modes

## 🛠️ Development

### Project Structure

```
InterviewAce/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server
│   │   ├── routes/
│   │   │   ├── resume.js         # Resume upload & parsing
│   │   │   ├── chat.js           # GPT integration
│   │   │   ├── livekit.js        # LiveKit room management
│   │   │   └── transcript.js     # Transcript processing
│   │   ├── services/
│   │   │   ├── chatService.js    # OpenAI GPT service
│   │   │   ├── resumeService.js  # Resume parsing
│   │   │   ├── livekitService.js # LiveKit integration
│   │   │   └── transcriptService.js # Transcript chunking
│   │   └── utils/
│   │       └── logger.js         # Winston logger
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app component
│   │   ├── components/
│   │   │   ├── Header.jsx        # Window controls
│   │   │   ├── TabBar.jsx        # Tab navigation
│   │   │   └── LiveKitAudio.jsx  # Audio streaming
│   │   ├── pages/
│   │   │   ├── TranscriptTab.jsx # Live transcription
│   │   │   ├── ChatTab.jsx       # AI chat interface
│   │   │   ├── PracticeTab.jsx   # Practice mode (NEW)
│   │   │   ├── ResumeTab.jsx     # Resume upload
│   │   │   └── SettingsTab.jsx   # Settings & audio devices
│   │   ├── store/
│   │   │   └── useStore.js       # Zustand state
│   │   └── styles/
│   │       └── index.css         # Tailwind + custom styles
│   └── package.json
└── electron/
    ├── main.js                   # Electron main process
    └── preload.js                # IPC bridge
```

### Backend API Endpoints

#### Resume
- `POST /api/resume/upload` - Upload and parse resume
- `GET /api/resume/context` - Get stored resume context

#### Chat
- `POST /api/chat/answer` - Generate answer from question
- `POST /api/chat/answer-from-transcript` - Generate answer from transcript
- `POST /api/chat/stream` - Stream GPT response

#### LiveKit
- `POST /api/livekit/create-room` - Create interview room
- `POST /api/livekit/token` - Generate access token
- `POST /api/livekit/end-room` - End interview session

#### Transcript
- `POST /api/transcript/process` - Process raw transcript
- `POST /api/transcript/merge` - Merge chunks into sentences

### Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- LiveKit Client
- Lucide Icons

**Backend:**
- Node.js + Express
- OpenAI GPT-4
- LiveKit Server SDK
- Multer (file uploads)
- PDF Parse / Mammoth
- Winston (logging)

**Desktop:**
- Electron
- IPC for stealth mode control

**Deployment:**
- Docker
- Docker Compose
- Nginx (frontend)

## 🔒 Privacy & Ethics

**Important:** InterviewAce is designed as an **educational tool** and **interview preparation assistant**. Please use this tool responsibly and ethically:

- ✅ Use for practice interviews with friends
- ✅ Use for preparing answers and building confidence
- ✅ Use for studying common interview questions
- ❌ Do not use to deceive actual interviewers
- ❌ Do not use in real interviews without disclosure
- ❌ Do not violate terms of service of interview platforms

**Always be honest and authentic in real interviews.**

## 🐛 Troubleshooting

### "Failed to connect to audio service"
- Check your LiveKit credentials in `.env`
- Ensure LiveKit URL is correct and accessible
- Verify your internet connection

### "Resume upload failed"
- Check file size (max 10MB)
- Supported formats: PDF, DOC, DOCX, TXT
- Ensure backend is running on port 5000

### Stealth mode not working
- Try pressing `Ctrl+Shift+H` multiple times
- Restart the application
- Check if window is set to always-on-top in settings

### Backend not starting
- Check if port 5000 is already in use
- Verify `.env` file exists and has correct API keys
- Check logs in `backend/logs/combined.log`

## 📝 Scripts

```bash
# Install all dependencies
npm run install:all

# Development mode (all services)
npm run dev

# Individual services
npm run dev:backend
npm run dev:frontend
npm run dev:electron

# Build
npm run build

# Docker
npm run docker:build
npm run docker:up
npm run docker:down

# Start Electron app
npm start
```

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📚 Documentation

- **[Features Roadmap](./FEATURES_ROADMAP.md)** - Detailed feature priorities and future plans
- **[Design System](./DESIGN_SYSTEM.md)** - UI/UX guidelines and component library
- **[API Documentation](#)** - Backend API reference (coming soon)

## 📄 License

MIT License - feel free to use this project for learning and personal use.

## 🙏 Acknowledgments

- **OpenAI / Azure OpenAI** for GPT models
- **Electron** for cross-platform desktop framework
- **React** team for the UI library
- **Tailwind CSS** for styling utilities
- **Framer Motion** for smooth animations
- **Lucide Icons** for beautiful icons

---

<p align="center">
  <strong>Built with ❤️ for interview preparation</strong>
</p>

<p align="center">
  <em>Note: Always use AI tools ethically and transparently in professional settings.</em>
</p>
