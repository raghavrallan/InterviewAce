const express = require('express');
const router = express.Router();
const aiProvider = require('../services/aiProvider');
const logger = require('../utils/logger');

/**
 * Get AI provider status
 * GET /api/status/ai
 */
router.get('/ai', (req, res) => {
  try {
    const info = aiProvider.getInfo();
    res.json({
      success: true,
      data: {
        provider: info.provider,
        model: info.model,
        initialized: info.initialized,
        availableProviders: info.available
      }
    });
  } catch (error) {
    logger.error('AI status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI provider status'
    });
  }
});

/**
 * Switch the active AI provider at runtime
 * POST /api/status/ai/provider  { provider: 'azure' | 'openai' | 'claude' }
 */
router.post('/ai/provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) {
      return res.status(400).json({ success: false, error: 'provider is required' });
    }
    const active = aiProvider.setProvider(provider);
    res.json({
      success: true,
      data: { provider: active, model: aiProvider.model }
    });
  } catch (error) {
    logger.error('AI provider switch error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to switch provider' });
  }
});

/**
 * Test AI connection
 * POST /api/status/ai/test
 */
router.post('/ai/test', async (req, res) => {
  try {
    const messages = [
      {
        role: 'user',
        content: 'Say "Connection successful" in exactly 2 words.'
      }
    ];

    const response = await aiProvider.chat(messages, {
      max_tokens: 10,
      temperature: 0
    });

    const content = aiProvider.getContent(response);

    res.json({
      success: true,
      data: {
        provider: aiProvider.provider,
        model: aiProvider.model,
        response: content,
        message: 'AI connection test successful'
      }
    });
  } catch (error) {
    logger.error('AI connection test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI connection test failed'
    });
  }
});

/**
 * Get overall system health
 * GET /api/status/health
 */
router.get('/health', (req, res) => {
  const aiInfo = aiProvider.getInfo();

  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'running',
        ai: {
          provider: aiInfo.provider,
          model: aiInfo.model,
          configured: !!aiInfo.provider
        }
      }
    }
  });
});

module.exports = router;
