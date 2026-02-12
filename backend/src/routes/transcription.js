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
 * Get the Whisper API URL and auth headers based on configured provider.
 * Supports: Azure OpenAI Whisper, standard OpenAI Whisper.
 */
function getWhisperConfig() {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const azureWhisperDeployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT;
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
  const openaiKey = process.env.OPENAI_API_KEY;

  // Azure Whisper: if we have an Azure whisper deployment configured
  if ((provider === 'azure' || azureEndpoint) && azureWhisperDeployment && azureKey) {
    const endpoint = azureEndpoint.replace(/\/$/, '');
    return {
      url: `${endpoint}/openai/deployments/${azureWhisperDeployment}/audio/transcriptions?api-version=${azureApiVersion}`,
      headers: { 'api-key': azureKey },
      provider: 'azure-whisper'
    };
  }

  // Standard OpenAI Whisper: if OPENAI_API_KEY is available
  if (openaiKey) {
    return {
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      provider: 'openai-whisper'
    };
  }

  // Fallback: try using Azure key with OpenAI endpoint (won't work but gives clear error)
  if (azureKey && !azureWhisperDeployment) {
    return {
      url: null,
      headers: {},
      provider: 'none',
      error: 'Whisper transcription requires either OPENAI_API_KEY or AZURE_OPENAI_WHISPER_DEPLOYMENT. ' +
             'If using Azure, deploy a Whisper model and set AZURE_OPENAI_WHISPER_DEPLOYMENT in .env. ' +
             'Otherwise, add OPENAI_API_KEY for standard OpenAI Whisper.'
    };
  }

  return {
    url: null,
    headers: {},
    provider: 'none',
    error: 'No API key configured for transcription. Set OPENAI_API_KEY or configure Azure Whisper deployment.'
  };
}

/**
 * POST /api/transcription/transcribe
 * Transcribe audio using Whisper API (OpenAI or Azure)
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const whisperConfig = getWhisperConfig();
    if (!whisperConfig.url) {
      return res.status(503).json({
        error: 'Transcription service not configured',
        details: whisperConfig.error
      });
    }

    filePath = req.file.path;
    const language = req.body.language || 'en';

    console.log(`🎙️ Transcribing audio (${whisperConfig.provider}):`, {
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

    // Call Whisper API
    const response = await axios.post(
      whisperConfig.url,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          ...whisperConfig.headers
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

    const whisperConfig = getWhisperConfig();
    if (!whisperConfig.url) {
      return res.status(503).json({
        error: 'Transcription service not configured',
        details: whisperConfig.error
      });
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
      whisperConfig.url,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          ...whisperConfig.headers
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
