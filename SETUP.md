# 🛠️ InterviewAce Setup Guide

Complete step-by-step guide to set up InterviewAce from scratch.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **npm** installed
   ```bash
   npm --version
   ```

3. **Docker Desktop** (optional, for containerized deployment)
   - Download from: https://www.docker.com/products/docker-desktop

4. **Git** (to clone the repository)

## 🔑 API Keys Setup

### 1. OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)

**Pricing:**
- GPT-4 Turbo: ~$0.01 per request (average)
- Set up billing limits to control costs

### 2. LiveKit Account

1. Go to [LiveKit Cloud](https://livekit.io/)
2. Sign up for free account
3. Create a new project
4. Copy:
   - **API Key**
   - **API Secret**
   - **WebSocket URL** (format: `wss://your-project.livekit.cloud`)

**Free Tier:**
- 50 GB bandwidth per month
- Perfect for personal use

## 📦 Installation Steps

### Step 1: Navigate to Project

```bash
cd InterviewAce
```

### Step 2: Install Dependencies

Install all dependencies for root, backend, and frontend:

```bash
npm run install:all
```

This runs:
- `npm install` in root directory
- `npm install` in backend directory
- `npm install` in frontend directory

**Troubleshooting:**
- If you get EACCES errors, try: `sudo npm install` (Linux/Mac)
- On Windows, run terminal as Administrator
- If npm is slow, try: `npm install --verbose`

### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your favorite editor:
   ```bash
   code .env  # VS Code
   # or
   notepad .env  # Windows
   # or
   nano .env  # Linux/Mac
   ```

3. Fill in your API keys:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxx
   OPENAI_MODEL=gpt-4-turbo-preview

   # LiveKit Configuration
   LIVEKIT_API_KEY=APIxxxxxxxxx
   LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   LIVEKIT_URL=wss://your-project.livekit.cloud

   # Backend Configuration
   PORT=5000
   NODE_ENV=development

   # Security
   JWT_SECRET=your-random-secret-here-change-this

   # File Upload
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=./uploads
   ```

4. **Generate JWT Secret** (optional but recommended):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and use it for `JWT_SECRET`

### Step 4: Verify Backend Setup

1. Start the backend server:
   ```bash
   npm run dev:backend
   ```

2. You should see:
   ```
   🚀 InterviewAce Backend running on port 5000
   📝 Environment: development
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```

   Should return:
   ```json
   {"status":"healthy","timestamp":"2024-01-01T00:00:00.000Z"}
   ```

4. Stop with `Ctrl+C`

### Step 5: Verify Frontend Setup

1. Start the frontend:
   ```bash
   npm run dev:frontend
   ```

2. You should see:
   ```
   VITE v5.0.10  ready in 500 ms

   ➜  Local:   http://localhost:5173/
   ```

3. Open browser to `http://localhost:5173/` to verify

4. Stop with `Ctrl+C`

### Step 6: Run Full Application

1. Start all services together:
   ```bash
   npm run dev
   ```

   This runs:
   - Backend on port 5000
   - Frontend on port 5173
   - Electron app (opens automatically)

2. Wait for Electron window to open

3. You should see the InterviewAce app with liquid glass design!

## 🐳 Docker Setup (Alternative)

If you prefer Docker:

### Step 1: Ensure Docker is Running

```bash
docker --version
docker-compose --version
```

### Step 2: Build Containers

```bash
npm run docker:build
```

This builds:
- Backend container
- Frontend container with Nginx

### Step 3: Start Containers

```bash
npm run docker:up
```

### Step 4: Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Step 5: View Logs

```bash
docker-compose logs -f
```

### Step 6: Stop Containers

```bash
npm run docker:down
```

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend health check responds at http://localhost:5000/health
- [ ] Frontend loads at http://localhost:5173/
- [ ] Electron app opens with liquid glass UI
- [ ] Can upload a resume in Resume tab
- [ ] Resume gets analyzed and summary appears
- [ ] Can type in Chat tab
- [ ] Stealth mode toggle works (Ctrl+Shift+H)
- [ ] Window controls work (minimize, close)
- [ ] Tabs switch smoothly

## 🔍 Testing Each Feature

### Test Resume Upload

1. Go to Resume tab
2. Upload a sample resume (PDF or DOCX)
3. Wait for analysis
4. Verify summary appears

**Test File:** Create a simple resume.txt:
```
John Doe
Software Engineer

Experience:
- 5 years of web development
- Expert in React and Node.js
- Built scalable applications

Skills:
JavaScript, TypeScript, React, Node.js, Docker
```

### Test Chat

1. Go to Chat tab
2. Type: "Tell me about your experience"
3. Hit Enter or click Send
4. Verify AI response appears based on resume

### Test Transcript (Simulated)

1. Go to Transcript tab
2. Click "Start"
3. Wait for simulated questions to appear
4. Click any transcript line
5. Verify answer appears in Chat tab

### Test Stealth Mode

1. Press `Ctrl+Shift+H`
2. Window should become semi-transparent
3. Try clicking through it (should be possible)
4. Press `Ctrl+Shift+H` again to restore

## 🚨 Common Issues & Solutions

### Port 5000 Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find and kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

Or change port in `.env`:
```env
PORT=5001
```

### OpenAI API Error

**Error:** `Failed to generate answer`

**Solutions:**
1. Verify API key is correct in `.env`
2. Check OpenAI API status: https://status.openai.com/
3. Ensure you have credits in your OpenAI account
4. Check backend logs: `backend/logs/combined.log`

### LiveKit Connection Failed

**Error:** `Failed to connect to audio service`

**Solutions:**
1. Verify LiveKit credentials in `.env`
2. Check LiveKit project is active
3. Test WebSocket URL in browser
4. Ensure firewall allows WebSocket connections

### Electron Not Opening

**Solutions:**
1. Ensure frontend and backend are running first
2. Wait 10-15 seconds for services to start
3. Check terminal for error messages
4. Try: `npm start` directly
5. Clear electron cache: `rm -rf node_modules/.cache`

### Resume Upload Fails

**Solutions:**
1. Check file size (< 10MB)
2. Verify file format (PDF, DOC, DOCX, TXT)
3. Check `backend/uploads/` directory exists
4. Ensure backend has write permissions
5. Check backend logs for errors

## 📊 System Requirements

### Minimum
- **CPU:** Dual-core 2.0 GHz
- **RAM:** 4 GB
- **Storage:** 500 MB free space
- **OS:** Windows 10, macOS 10.15+, Ubuntu 20.04+

### Recommended
- **CPU:** Quad-core 2.5 GHz+
- **RAM:** 8 GB+
- **Storage:** 1 GB free space
- **OS:** Windows 11, macOS 12+, Ubuntu 22.04+

## 🎯 Next Steps

Once setup is complete:

1. **Prepare Your Resume** - Upload your actual resume
2. **Practice Questions** - Test with common interview questions
3. **Customize Prompts** - Edit `backend/src/services/chatService.js` to adjust AI behavior
4. **Test Stealth Mode** - Practice using keyboard shortcuts
5. **Configure Hotkeys** - Customize in `electron/main.js` if needed

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)

## 💡 Tips

1. **Keep API Keys Secret** - Never commit `.env` to version control
2. **Monitor API Usage** - Check OpenAI dashboard regularly
3. **Update Dependencies** - Run `npm update` periodically
4. **Backup Resume** - Keep original resume file safe
5. **Practice First** - Test with mock interviews before real ones

---

**Need Help?** Check the main [README.md](README.md) for troubleshooting guide.
