const express = require('express');
const router = express.Router();
const transcriptService = require('../services/transcriptService');
const logger = require('../utils/logger');

// Process and clean transcript chunks
router.post('/process', async (req, res, next) => {
  try {
    const { rawTranscript, speaker } = req.body;

    if (!rawTranscript) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    const processedTranscript = transcriptService.processTranscript(rawTranscript, speaker);

    res.json({
      success: true,
      data: processedTranscript
    });
  } catch (error) {
    logger.error('Transcript processing error:', error);
    next(error);
  }
});

// Merge transcript chunks into sentences
router.post('/merge', async (req, res, next) => {
  try {
    const { chunks } = req.body;

    if (!chunks || !Array.isArray(chunks)) {
      return res.status(400).json({ error: 'Chunks array is required' });
    }

    const mergedTranscripts = transcriptService.mergeIntoSentences(chunks);

    res.json({
      success: true,
      data: mergedTranscripts
    });
  } catch (error) {
    logger.error('Transcript merge error:', error);
    next(error);
  }
});

module.exports = router;
