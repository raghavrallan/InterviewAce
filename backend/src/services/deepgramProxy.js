/**
 * Deepgram WebSocket Proxy Service
 * 
 * Relays audio from frontend WebSocket clients to Deepgram's
 * real-time streaming API, and sends transcription results back.
 * Keeps DEEPGRAM_API_KEY secure on the backend.
 */

const WebSocket = require('ws');
const logger = require('../utils/logger');
const url = require('url');

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';

/**
 * Build the Deepgram WebSocket URL with query parameters
 */
function buildDeepgramUrl(language = 'en') {
  const params = new URLSearchParams({
    model: 'nova-3',
    language,
    punctuate: 'true',
    interim_results: 'true',
    endpointing: '300',
    vad_events: 'true',
    smart_format: 'true',
    // Do NOT specify encoding/sample_rate/channels - Deepgram auto-detects from webm container
  });
  return `${DEEPGRAM_WS_URL}?${params.toString()}`;
}

/**
 * Set up the Deepgram WebSocket proxy on the HTTP server.
 * Listens for upgrade requests on /ws/transcribe
 */
function setupDeepgramProxy(server) {
  const wss = new WebSocket.Server({ noServer: true });

  // Handle HTTP upgrade -> WebSocket
  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws/transcribe') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Handle new client connections
  wss.on('connection', (clientWs, request) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      logger.error('DEEPGRAM_API_KEY not configured');
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Deepgram API key not configured. Add DEEPGRAM_API_KEY to your .env file.'
      }));
      clientWs.close(1008, 'API key not configured');
      return;
    }

    // Parse language from query string (e.g., /ws/transcribe?language=en)
    const parsedUrl = url.parse(request.url, true);
    const language = parsedUrl.query.language || 'en';

    logger.info(`New Deepgram STT session - language: ${language}`);

    // Open connection to Deepgram
    const deepgramUrl = buildDeepgramUrl(language);
    let deepgramWs = null;
    let isClosing = false;

    try {
      deepgramWs = new WebSocket(deepgramUrl, {
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
      });
    } catch (err) {
      logger.error('Failed to create Deepgram WebSocket:', err);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to Deepgram'
      }));
      clientWs.close(1011, 'Deepgram connection failed');
      return;
    }

    // Deepgram connection opened
    deepgramWs.on('open', () => {
      logger.info('Deepgram WebSocket connected');
      clientWs.send(JSON.stringify({
        type: 'status',
        message: 'connected',
        provider: 'deepgram'
      }));
    });

    // Receive transcription results from Deepgram -> forward to client
    deepgramWs.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());

        if (response.type === 'Results') {
          const transcript = response.channel?.alternatives?.[0]?.transcript || '';
          const isFinal = response.is_final || false;
          const speechFinal = response.speech_final || false;
          const confidence = response.channel?.alternatives?.[0]?.confidence || 0;

          if (transcript.trim()) {
            clientWs.send(JSON.stringify({
              type: 'transcript',
              transcript: transcript.trim(),
              is_final: isFinal,
              speech_final: speechFinal,
              confidence,
              start: response.start,
              duration: response.duration,
            }));
          }
        } else if (response.type === 'SpeechStarted') {
          clientWs.send(JSON.stringify({ type: 'speech_started' }));
        } else if (response.type === 'UtteranceEnd') {
          clientWs.send(JSON.stringify({ type: 'utterance_end' }));
        }
      } catch (err) {
        logger.error('Error parsing Deepgram message:', err);
      }
    });

    // Deepgram error
    deepgramWs.on('error', (err) => {
      logger.error('Deepgram WebSocket error:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: `Deepgram error: ${err.message}`
        }));
      }
    });

    // Deepgram closed
    deepgramWs.on('close', (code, reason) => {
      logger.info(`Deepgram WebSocket closed: ${code} ${reason}`);
      if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'status',
          message: 'disconnected'
        }));
      }
    });

    // Receive audio from client -> forward to Deepgram
    clientWs.on('message', (data) => {
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        // Check if it's a control message (JSON) or audio data (binary)
        if (typeof data === 'string') {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'keepalive') {
              deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
            } else if (msg.type === 'close') {
              deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
            }
          } catch (e) {
            // Not JSON, ignore
          }
        } else {
          // Binary audio data - relay to Deepgram
          deepgramWs.send(data);
        }
      }
    });

    // Client disconnected
    clientWs.on('close', () => {
      isClosing = true;
      logger.info('Client disconnected from STT session');
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
        deepgramWs.close();
      }
    });

    clientWs.on('error', (err) => {
      logger.error('Client WebSocket error:', err.message);
      isClosing = true;
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.close();
      }
    });

    // Keepalive interval to prevent timeout
    const keepaliveInterval = setInterval(() => {
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
      } else {
        clearInterval(keepaliveInterval);
      }
    }, 10000); // Every 10 seconds

    // Clean up keepalive on close
    clientWs.on('close', () => clearInterval(keepaliveInterval));
  });

  logger.info('Deepgram WebSocket proxy initialized on /ws/transcribe');
}

module.exports = { setupDeepgramProxy };
