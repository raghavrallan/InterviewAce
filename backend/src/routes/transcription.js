const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

// Configure multer for audio file uploads
const upload = multer({
  dest: 'uploads/audio/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Allowed: webm, wav, mp3, ogg'));
    }
  }
});

/**
 * POST /api/transcription/transcribe
 * Transcribe audio using OpenAI Whisper API
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    filePath = req.file.path;
    const language = req.body.language || 'en';

    console.log('🎙️ Transcribing audio file:', {
      originalName: req.file.originalname,
      size: req.file.size,
      language
    });

    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: 'audio.webm',
      contentType: req.file.mimetype
    });
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const transcript = response.data.text;

    console.log('✅ Transcription successful:', {
      length: transcript.length,
      preview: transcript.substring(0, 100)
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      transcript,
      language
    });

  } catch (error) {
    console.error('❌ Transcription error:', error.response?.data || error.message);

    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * POST /api/transcription/stream
 * Real-time transcription endpoint (chunks of audio)
 */
router.post('/stream', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio chunk provided' });
    }

    filePath = req.file.path;
    const language = req.body.language || 'en';

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: 'chunk.webm',
      contentType: req.file.mimetype
    });
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'json');

    // Call Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Clean up
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      transcript: response.data.text
    });

  } catch (error) {
    console.error('❌ Stream transcription error:', error.message);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      error: 'Failed to transcribe audio chunk',
      details: error.message
    });
  }
});

module.exports = router;
