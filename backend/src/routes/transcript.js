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

// Save an interview session (transcripts + AI answers) to disk
router.post('/save', async (req, res, next) => {
  try {
    const { transcripts, messages, startedAt, endedAt, meta } = req.body;
    if (!Array.isArray(transcripts) || transcripts.length === 0) {
      return res.status(400).json({ success: false, error: 'transcripts array is required' });
    }
    const summary = transcriptService.saveSession({ transcripts, messages, startedAt, endedAt, meta });
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Transcript save error:', error);
    next(error);
  }
});

// List saved sessions (newest first)
router.get('/sessions', async (req, res, next) => {
  try {
    res.json({ success: true, data: { sessions: transcriptService.listSessions() } });
  } catch (error) {
    logger.error('Transcript list error:', error);
    next(error);
  }
});

// Get a single saved session (raw JSON)
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = transcriptService.getSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error('Transcript get error:', error);
    next(error);
  }
});

// Download a saved session as .md or .txt
router.get('/sessions/:id/download', async (req, res, next) => {
  try {
    const session = transcriptService.getSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const format = req.query.format === 'txt' ? 'txt' : 'md';
    const body = transcriptService.formatSession(session, format);
    const dateStr = new Date(session.startedAt).toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `interview-${dateStr}.${format}`;

    res.setHeader('Content-Type', format === 'md' ? 'text/markdown' : 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (error) {
    logger.error('Transcript download error:', error);
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
