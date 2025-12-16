const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_URL;
    this.enabled = false;

    if (!this.apiKey || !this.apiSecret || this.apiKey === 'optional') {
      logger.warn('LiveKit credentials not configured - using Web Speech API instead');
      this.roomService = null;
      return;
    }

    try {
      this.roomService = new RoomServiceClient(
        this.wsUrl,
        this.apiKey,
        this.apiSecret
      );
      this.enabled = true;
      logger.info('LiveKit service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LiveKit:', error);
      this.roomService = null;
    }
  }

  async createRoom(participantName = 'Candidate') {
    if (!this.enabled || !this.roomService) {
      logger.info('LiveKit not configured - using Web Speech API');
      return {
        roomName: `web-speech-${uuidv4()}`,
        token: 'web-speech-api',
        wsUrl: 'browser-built-in',
        participantName,
        mode: 'web-speech-api'
      };
    }

    try {
      const roomName = `interview-${uuidv4()}`;

      // Create room
      await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 10, // 10 minutes
        maxParticipants: 1
      });

      // Generate token
      const token = await this.generateToken(roomName, participantName);

      logger.info(`Created LiveKit room: ${roomName}`);

      return {
        roomName,
        token,
        wsUrl: this.wsUrl,
        participantName,
        mode: 'livekit'
      };
    } catch (error) {
      logger.error('LiveKit room creation error:', error);
      throw new Error('Failed to create interview room');
    }
  }

  async generateToken(roomName, participantName) {
    if (!this.enabled || !this.roomService) {
      return 'web-speech-api-token';
    }

    try {
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantName,
        ttl: '2h'
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      });

      return at.toJwt();
    } catch (error) {
      logger.error('Token generation error:', error);
      throw new Error('Failed to generate access token');
    }
  }

  async deleteRoom(roomName) {
    try {
      await this.roomService.deleteRoom(roomName);
      logger.info(`Deleted LiveKit room: ${roomName}`);
    } catch (error) {
      logger.error('Room deletion error:', error);
      throw new Error('Failed to delete room');
    }
  }

  async listRooms() {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms;
    } catch (error) {
      logger.error('List rooms error:', error);
      throw new Error('Failed to list rooms');
    }
  }
}

module.exports = new LiveKitService();
