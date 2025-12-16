const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const logger = require('../utils/logger');

// Generate answer based on resume context
router.post('/answer', async (req, res, next) => {
  try {
    const { question, resumeContext, conversationHistory } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    logger.info(`Generating answer for question: ${question.substring(0, 50)}...`);

    const answer = await chatService.generateAnswer({
      question,
      resumeContext,
      conversationHistory: conversationHistory || []
    });

    res.json({
      success: true,
      data: {
        answer,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Chat answer error:', error);
    next(error);
  }
});

// Generate answer from transcript click
router.post('/answer-from-transcript', async (req, res, next) => {
  try {
    const { transcriptText, resumeContext, previousContext } = req.body;

    if (!transcriptText) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    const answer = await chatService.generateAnswerFromTranscript({
      transcriptText,
      resumeContext,
      previousContext: previousContext || []
    });

    res.json({
      success: true,
      data: {
        answer,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Transcript answer error:', error);
    next(error);
  }
});

// Stream answer (for real-time response)
router.post('/stream', async (req, res, next) => {
  try {
    const { question, resumeContext } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await chatService.streamAnswer(question, resumeContext, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('Chat stream error:', error);
    next(error);
  }
});

module.exports = router;
