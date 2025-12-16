# 📡 InterviewAce API Documentation

Complete API reference for the InterviewAce backend.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

Currently no authentication required. For production, implement JWT tokens.

---

## 📄 Resume Endpoints

### Upload Resume

Upload and parse a resume file.

**Endpoint:** `POST /api/resume/upload`

**Content-Type:** `multipart/form-data`

**Body:**
```
resume: File (PDF, DOC, DOCX, TXT)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "resume-1234567890.pdf",
    "text": "John Doe\nSoftware Engineer...",
    "summary": "Experienced software engineer with 5 years...",
    "metadata": {
      "filename": "resume-1234567890.pdf",
      "size": 245678,
      "uploadedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400` - No file uploaded or invalid file type
- `413` - File too large (max 10MB)
- `500` - Server error

---

### Get Resume Context

Retrieve stored resume context.

**Endpoint:** `GET /api/resume/context`

**Response:**
```json
{
  "success": true,
  "data": {
    "context": "Resume text content...",
    "available": true
  }
}
```

---

## 💬 Chat Endpoints

### Generate Answer

Generate an AI answer based on a question and resume context.

**Endpoint:** `POST /api/chat/answer`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "question": "Tell me about your experience with React",
  "resumeContext": "Full resume text...",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant",
      "content": "Previous answer"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "I have over 5 years of experience with React...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Missing required fields
- `500` - OpenAI API error

---

### Answer from Transcript

Generate an answer from a transcript click.

**Endpoint:** `POST /api/chat/answer-from-transcript`

**Body:**
```json
{
  "transcriptText": "Tell me about a challenging project",
  "resumeContext": "Full resume text...",
  "previousContext": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "One of the most challenging projects I worked on...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### Stream Answer (SSE)

Stream AI response in real-time using Server-Sent Events.

**Endpoint:** `POST /api/chat/stream`

**Body:**
```json
{
  "question": "What are your strengths?",
  "resumeContext": "Full resume text..."
}
```

**Response:** Server-Sent Events stream
```
data: {"chunk":"I"}

data: {"chunk":" believe"}

data: {"chunk":" my"}

data: [DONE]
```

---

## 🎙️ LiveKit Endpoints

### Create Room

Create a new LiveKit room for interview session.

**Endpoint:** `POST /api/livekit/create-room`

**Body:**
```json
{
  "participantName": "Candidate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomName": "interview-uuid-1234",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "wsUrl": "wss://your-project.livekit.cloud",
    "participantName": "Candidate"
  }
}
```

---

### Generate Token

Generate access token for existing room.

**Endpoint:** `POST /api/livekit/token`

**Body:**
```json
{
  "roomName": "interview-uuid-1234",
  "participantName": "Candidate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `400` - Missing room name or participant name
- `500` - LiveKit API error

---

### End Room

Delete a LiveKit room.

**Endpoint:** `POST /api/livekit/end-room`

**Body:**
```json
{
  "roomName": "interview-uuid-1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Room ended successfully"
}
```

---

## 📝 Transcript Endpoints

### Process Transcript

Process and clean raw transcript text.

**Endpoint:** `POST /api/transcript/process`

**Body:**
```json
{
  "rawTranscript": "So... um... tell me about yourself",
  "speaker": "Interviewer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1234567890.123,
    "text": "So tell me about yourself",
    "speaker": "Interviewer",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "isFinal": true
  }
}
```

---

### Merge Chunks

Merge transcript chunks into complete sentences.

**Endpoint:** `POST /api/transcript/merge`

**Body:**
```json
{
  "chunks": [
    {
      "text": "Tell me",
      "speaker": "Interviewer",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    {
      "text": "about your",
      "speaker": "Interviewer",
      "timestamp": "2024-01-01T12:00:01.000Z"
    },
    {
      "text": "experience.",
      "speaker": "Interviewer",
      "timestamp": "2024-01-01T12:00:02.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1234567890.123,
      "text": "Tell me about your experience.",
      "speaker": "Interviewer",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "isFinal": true
    }
  ]
}
```

---

## 🏥 Health Check

### Server Health

Check if server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## 🔒 Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (if auth is implemented)
- `413` - Payload Too Large (file size exceeded)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## 📊 Rate Limiting

Current rate limits:
- **100 requests per 15 minutes** per IP
- Applies to all `/api/*` endpoints
- Returns `429` when exceeded

---

## 🔌 WebSocket Events (Future)

Planned for real-time transcript updates:

```javascript
// Connect
const ws = new WebSocket('ws://localhost:5000/ws');

// Listen for transcripts
ws.on('transcript', (data) => {
  console.log('New transcript:', data);
});

// Send audio
ws.send(audioBlob);
```

---

## 🛠️ Testing with cURL

### Upload Resume
```bash
curl -X POST http://localhost:5000/api/resume/upload \
  -F "resume=@/path/to/resume.pdf"
```

### Generate Answer
```bash
curl -X POST http://localhost:5000/api/chat/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are your strengths?",
    "resumeContext": "Resume text here..."
  }'
```

### Create LiveKit Room
```bash
curl -X POST http://localhost:5000/api/livekit/create-room \
  -H "Content-Type: application/json" \
  -d '{
    "participantName": "John Doe"
  }'
```

---

## 📚 Integration Examples

### JavaScript/Axios

```javascript
import axios from 'axios';

// Upload resume
const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  const { data } = await axios.post(
    'http://localhost:5000/api/resume/upload',
    formData
  );

  return data;
};

// Get AI answer
const getAnswer = async (question, resumeContext) => {
  const { data } = await axios.post(
    'http://localhost:5000/api/chat/answer',
    { question, resumeContext }
  );

  return data.data.answer;
};
```

### Python/Requests

```python
import requests

# Upload resume
def upload_resume(file_path):
    with open(file_path, 'rb') as f:
        files = {'resume': f}
        response = requests.post(
            'http://localhost:5000/api/resume/upload',
            files=files
        )
    return response.json()

# Get AI answer
def get_answer(question, resume_context):
    payload = {
        'question': question,
        'resumeContext': resume_context
    }
    response = requests.post(
        'http://localhost:5000/api/chat/answer',
        json=payload
    )
    return response.json()['data']['answer']
```

---

## 🚀 Performance Tips

1. **Cache Resume Context** - Store resume context client-side
2. **Debounce Requests** - Wait for user to stop typing
3. **Use Streaming** - For long responses, use `/api/chat/stream`
4. **Compress Uploads** - Compress PDFs before uploading
5. **Connection Pooling** - Reuse HTTP connections

---

## 🔐 Security Best Practices

1. **Implement Auth** - Add JWT tokens for production
2. **Validate Input** - Always validate file types and sizes
3. **Sanitize Data** - Clean user input before processing
4. **Use HTTPS** - Enable SSL in production
5. **Rate Limiting** - Already implemented (100 req/15min)
6. **CORS Policy** - Configure allowed origins

---

## 📈 Monitoring

Monitor these metrics:
- API response times
- OpenAI API costs
- LiveKit bandwidth usage
- Error rates
- Upload file sizes

Use the Winston logs in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only

---

## 🆘 Support

For API issues:
1. Check logs: `backend/logs/combined.log`
2. Verify environment variables
3. Test with cURL first
4. Check OpenAI/LiveKit service status

---

**API Version:** 1.0.0
**Last Updated:** 2024
