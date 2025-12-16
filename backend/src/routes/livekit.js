const express = require('express');
const router = express.Router();
const livekitService = require('../services/livekitService');
const logger = require('../utils/logger');

// Create a new interview room
router.post('/create-room', async (req, res, next) => {
  try {
    const { participantName } = req.body;

    logger.info(`Creating LiveKit room for participant: ${participantName || 'Anonymous'}`);

    const roomData = await livekitService.createRoom(participantName);

    res.json({
      success: true,
      data: roomData
    });
  } catch (error) {
    logger.error('LiveKit room creation error:', error);
    next(error);
  }
});

// Generate token for room access
router.post('/token', async (req, res, next) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'Room name and participant name are required' });
    }

    const token = await livekitService.generateToken(roomName, participantName);

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    logger.error('Token generation error:', error);
    next(error);
  }
});

// End interview room
router.post('/end-room', async (req, res, next) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    await livekitService.deleteRoom(roomName);

    res.json({
      success: true,
      message: 'Room ended successfully'
    });
  } catch (error) {
    logger.error('Room deletion error:', error);
    next(error);
  }
});

module.exports = router;
