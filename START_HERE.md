# 🎯 START HERE - InterviewAce

## ⚡ Quick Start (3 Commands)

```bash
# 1. Navigate to project
cd InterviewAce

# 2. Install dependencies (one time only)
npm run install:all

# 3. Start the app
npm run dev
```

**That's it!** The Electron app will open automatically.

---

## 🎬 What Happens Next

1. **Terminal windows open** - Backend & Frontend starting
2. **Browser opens** - Frontend dev server (optional, can close)
3. **Electron app opens** - Main application window
4. **You're ready!** - Start using InterviewAce

---

## 📱 First Time Setup (In the App)

### Step 1: Upload Resume (30 seconds)
1. Click **Resume** tab
2. Drag & drop your resume
3. Wait for AI to analyze

### Step 2: Test Microphone (10 seconds)
1. Click **Transcript** tab
2. Click **Start** button
3. Allow microphone when prompted
4. Say "Testing one two three"
5. Should see transcript appear!

### Step 3: Get AI Answer (5 seconds)
1. Click any transcript line
2. AI generates answer
3. Check **Chat** tab to see it

### Step 4: Try Stealth Mode (Optional)
Press `Ctrl+Shift+H` - window becomes invisible!

---

## ⌨️ Essential Shortcuts

| Keys | What It Does |
|------|--------------|
| `Ctrl+Shift+H` | 👻 Stealth Mode (invisible) |
| `Ctrl+Shift+I` | 👁️ Hide/Show Window |
| `Ctrl+Shift+A` | 🎯 Focus & Exit Stealth |

---

## 🌐 Browser Recommendation

**Use Chrome for best results!**

Web Speech API works in:
- ✅ **Chrome** ⭐ (Best)
- ✅ Edge
- ✅ Safari
- ❌ Firefox (not supported)

---

## 🔧 What's Configured

✅ **OpenAI API Key** - Your key is active
✅ **Speech Recognition** - Free Web Speech API (no keys needed)
✅ **Backend Server** - Port 5000
✅ **Frontend Dev** - Port 5173
✅ **Electron App** - Ready to go

---

## 📚 Need More Info?

- **Quick Guide:** [QUICKSTART.md](QUICKSTART.md) - 5 min tutorial
- **Full Guide:** [README.md](README.md) - Complete documentation
- **Setup Details:** [SETUP.md](SETUP.md) - Advanced setup
- **API Docs:** [API.md](API.md) - For developers
- **Changes:** [CHANGES.md](CHANGES.md) - What was configured

---

## 🚨 Troubleshooting

### "Cannot find module"
```bash
npm run install:all
```

### "Port 5000 already in use"
Close other apps using port 5000, or:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <number> /F
```

### "Microphone not working"
1. Check browser is Chrome/Edge
2. Allow microphone access
3. Check mic is connected

### "OpenAI API error"
Your key is configured! If issues:
1. Check internet connection
2. Verify OpenAI account has credits
3. Check [OpenAI Status](https://status.openai.com/)

---

## 💡 Pro Tips

1. **Upload Resume First** - AI needs it for context
2. **Use Chrome** - Best speech recognition
3. **Practice Shortcuts** - Master stealth mode
4. **Test Before Interview** - Make sure everything works
5. **Keep Window Small** - Easy to hide in corner

---

## 🎯 You're Ready to Go!

**Run this now:**
```bash
npm run dev
```

**Or double-click:**
- Windows: `start.bat`
- Mac/Linux: `start.sh`

---

## 📊 App URLs (when running)

- **Backend API:** http://localhost:5000
- **Frontend Dev:** http://localhost:5173
- **Electron App:** Opens automatically
- **Health Check:** http://localhost:5000/health

---

## 🎓 Example Workflow

```
1. Upload resume
   ↓
2. Start transcript recording
   ↓
3. Speak or let interviewer speak
   ↓
4. Click transcript → Get AI answer
   ↓
5. Use answer as reference
   ↓
6. Deliver naturally!
```

---

## 🔒 Remember

**This is for practice and preparation!**

✅ Mock interviews
✅ Preparation
✅ Building confidence

❌ Not for deceiving interviewers
❌ Be authentic in real interviews

---

## 🆘 Still Stuck?

1. Check terminal for errors
2. Ensure Node.js 18+ installed: `node --version`
3. Try: `npm run clean` then `npm run install:all`
4. Restart computer if weird issues

---

## 🚀 Let's Go!

Ready? Run this:

```bash
npm run dev
```

**Good luck with your interviews!** 🎯

---

**Built with ❤️ for interview success**
