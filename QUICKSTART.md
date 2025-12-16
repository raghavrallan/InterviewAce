# 🚀 InterviewAce - Quick Start Guide

Get up and running in 5 minutes!

## ✅ What You Need

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **OpenAI API Key** - Already configured! ✨
3. **No other API keys needed!** - We're using free Web Speech API

## 📦 Installation (3 Steps)

### 1. Install Dependencies

```bash
cd InterviewAce
npm run install:all
```

This installs everything for backend, frontend, and electron.

### 2. Environment is Ready!

Your `.env` file is already configured with:
- ✅ OpenAI API Key (provided)
- ✅ Web Speech API (free, built-in browser STT)
- ✅ All settings configured

### 3. Start the App

```bash
npm run dev
```

**Or use the shortcuts:**
- Windows: Double-click `start.bat`
- Mac/Linux: Run `./start.sh`

This starts:
- Backend server (port 5000)
- Frontend dev server (port 5173)
- Electron app (opens automatically)

## 🎯 First Time Usage

### Step 1: Upload Your Resume
1. Electron app will open automatically
2. Click the **Resume** tab
3. Drag & drop your resume (PDF, DOC, DOCX, or TXT)
4. Wait 5-10 seconds for AI to analyze it

### Step 2: Start Interview Practice
1. Go to **Transcript** tab
2. Click the **Start** button
3. Allow microphone access when prompted
4. Start speaking! The app will transcribe in real-time

### Step 3: Get AI Answers
**Method 1:** Click any transcript line
- Click on any question that appears
- AI generates an answer instantly
- Answer appears in Chat tab

**Method 2:** Type directly
- Go to **Chat** tab
- Type your interview question
- Get personalized answer based on your resume

### Step 4: Enable Stealth Mode (Optional)
- Press `Ctrl+Shift+H` to make window invisible
- Perfect for screen sharing
- Press again to restore

## 🎤 How Speech Recognition Works

**We're using Web Speech API** (free, no API keys needed!)

### Supported Browsers
- ✅ Chrome (Recommended)
- ✅ Microsoft Edge
- ✅ Safari
- ✅ Opera
- ❌ Firefox (not supported)

### How It Works
1. Click "Start" in Transcript tab
2. Browser asks for microphone permission (allow it)
3. Speak naturally - it transcribes automatically
4. Transcripts appear as complete sentences (not choppy chunks)
5. Click any transcript to get AI answer

### Tips for Best Results
- 🎤 Use a good microphone or headset
- 🔇 Minimize background noise
- 🗣️ Speak clearly and naturally
- ⏸️ Pause briefly between sentences
- 💻 Use Chrome for best accuracy

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle Stealth Mode (invisible) |
| `Ctrl+Shift+I` | Hide/Show Window |
| `Ctrl+Shift+A` | Focus Window & Exit Stealth |

## 🎨 Features Overview

### 1. Resume Tab
- Upload resume (PDF, DOC, DOCX, TXT)
- AI-powered summary generation
- Context for all future answers

### 2. Transcript Tab
- Real-time speech transcription
- Smart sentence detection
- Click any line for instant answer

### 3. Chat Tab
- Direct Q&A with AI
- Resume-aware responses
- Conversation history
- Type questions manually

### 4. Settings Tab
- View keyboard shortcuts
- Check system status
- App information

## 🔧 Troubleshooting

### "Microphone access denied"
**Solution:** Allow microphone access in browser settings
- Chrome: Settings → Privacy → Microphone → Allow

### "Speech recognition not supported"
**Solution:** Use Chrome or Edge browser
- Firefox doesn't support Web Speech API

### Backend not starting
**Solution:** Check if port 5000 is free
```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

### Resume upload fails
**Solutions:**
- Check file size (max 10MB)
- Use supported format (PDF, DOC, DOCX, TXT)
- Ensure backend is running

### No transcripts appearing
**Solutions:**
- Check microphone is connected and working
- Ensure you clicked "Allow" for microphone access
- Try speaking louder or closer to mic
- Check browser console for errors (F12)

## 💡 Pro Tips

1. **Upload Resume First** - AI needs context to generate good answers
2. **Test Microphone** - Go to Transcript tab and test before actual interview
3. **Practice Shortcuts** - Learn `Ctrl+Shift+H` for quick stealth mode
4. **Keep It Open** - App stays in corner, ready when you need it
5. **Check Transcripts** - Review what was captured for accuracy

## 📊 System Check

Run this checklist:
- [ ] Node.js installed? `node --version`
- [ ] Dependencies installed? `npm run install:all`
- [ ] Backend starts? Check http://localhost:5000/health
- [ ] Frontend loads? Check http://localhost:5173
- [ ] Electron opens? Should open automatically
- [ ] Can upload resume? Try in Resume tab
- [ ] Microphone works? Test in Transcript tab
- [ ] Stealth mode works? Press `Ctrl+Shift+H`

## 🎓 Example Workflow

1. **Prepare** (Before Interview)
   ```
   → Upload your resume
   → Test microphone
   → Practice a few questions
   → Learn keyboard shortcuts
   ```

2. **During Mock Interview**
   ```
   → Start transcript recording
   → Listen to questions
   → Click transcript for answers
   → Practice delivering answers naturally
   ```

3. **During Real Interview** (Use Responsibly!)
   ```
   → Enable stealth mode (Ctrl+Shift+H)
   → Keep window in corner
   → Use as reference only
   → Be authentic and honest
   ```

## 🔒 Privacy & Ethics

**Important:** This tool is for **practice and preparation**

✅ **Good Uses:**
- Mock interviews with friends
- Preparing for common questions
- Building confidence
- Learning from AI suggestions

❌ **Bad Uses:**
- Deceiving real interviewers
- Pretending AI answers are yours
- Reading answers word-for-word
- Violating interview platform terms

**Always be honest and authentic in real interviews!**

## 📚 Next Steps

- Read [README.md](README.md) for full feature list
- Check [SETUP.md](SETUP.md) for detailed setup
- Review [API.md](API.md) for API documentation

## 🆘 Need Help?

1. Check the console (F12) for errors
2. Review backend logs: `backend/logs/combined.log`
3. Ensure .env file has correct API key
4. Try restarting the application

## 🎯 You're Ready!

That's it! You're all set to start using InterviewAce.

**Quick Commands:**
```bash
# Start everything
npm run dev

# Or use shortcuts
start.bat          # Windows
./start.sh         # Mac/Linux

# Stop: Press Ctrl+C in terminal
```

---

**Built with ❤️ for interview success**

Remember: Use AI as a practice tool, not a replacement for genuine preparation! 🚀
