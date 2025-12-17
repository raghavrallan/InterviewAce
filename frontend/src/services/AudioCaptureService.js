/**
 * AudioCaptureService - Handles dual audio capture (system audio + microphone)
 * Uses electron-audio-loopback for system audio capture
 */

class AudioCaptureService {
  constructor() {
    this.systemAudioStream = null;
    this.microphoneStream = null;
    this.combinedStream = null;
    this.audioContext = null;
    this.systemSource = null;
    this.micSource = null;
    this.destination = null;
    this.isCapturing = false;
    this.audioLevels = { system: 0, mic: 0 };
    this.onAudioLevelUpdate = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  /**
   * Initialize audio context and setup audio graph
   */
  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.destination = this.audioContext.createMediaStreamDestination();
      console.log('🎤 AudioCaptureService initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AudioContext:', error);
      throw error;
    }
  }

  /**
   * Capture system audio (loopback) - requires electron-audio-loopback
   */
  async captureSystemAudio() {
    try {
      // Request system audio with loopback constraint
      // electron-audio-loopback enables the chromeMediaSourceId constraint
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: 'loopback'
          }
        },
        video: false
      };

      this.systemAudioStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Connect to audio context
      this.systemSource = this.audioContext.createMediaStreamSource(this.systemAudioStream);
      this.systemSource.connect(this.destination);

      // Setup audio level monitoring for system audio
      this.setupAudioLevelMonitoring(this.systemSource, 'system');

      console.log('✅ System audio capture started');
      return this.systemAudioStream;
    } catch (error) {
      console.error('❌ Failed to capture system audio:', error);
      // Fallback: try standard desktop audio capture
      return this.captureSystemAudioFallback();
    }
  }

  /**
   * Fallback method for system audio capture (standard desktop audio)
   */
  async captureSystemAudioFallback() {
    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      };

      this.systemAudioStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      if (this.systemAudioStream.getAudioTracks().length === 0) {
        throw new Error('No audio tracks in display media');
      }

      this.systemSource = this.audioContext.createMediaStreamSource(this.systemAudioStream);
      this.systemSource.connect(this.destination);
      this.setupAudioLevelMonitoring(this.systemSource, 'system');

      console.log('✅ System audio capture started (fallback method)');
      return this.systemAudioStream;
    } catch (error) {
      console.error('❌ Fallback system audio capture failed:', error);
      throw error;
    }
  }

  /**
   * Capture microphone audio
   */
  async captureMicrophone(deviceId = 'default') {
    try {
      const constraints = {
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };

      this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Connect to audio context
      this.micSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.micSource.connect(this.destination);

      // Setup audio level monitoring for microphone
      this.setupAudioLevelMonitoring(this.micSource, 'mic');

      console.log('✅ Microphone capture started');
      return this.microphoneStream;
    } catch (error) {
      console.error('❌ Failed to capture microphone:', error);
      throw error;
    }
  }

  /**
   * Setup audio level monitoring using AnalyserNode
   */
  setupAudioLevelMonitoring(source, type) {
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!this.isCapturing) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const normalizedLevel = average / 255;

      this.audioLevels[type] = normalizedLevel;

      // Callback for UI updates
      if (this.onAudioLevelUpdate) {
        this.onAudioLevelUpdate(type, normalizedLevel);
      }

      requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  /**
   * Start dual audio capture (system + microphone)
   */
  async startCapture(micDeviceId = 'default') {
    try {
      if (!this.audioContext) {
        await this.initialize();
      }

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Start both audio captures
      await Promise.all([
        this.captureSystemAudio(),
        this.captureMicrophone(micDeviceId)
      ]);

      this.combinedStream = this.destination.stream;
      this.isCapturing = true;

      console.log('✅ Dual audio capture started successfully');
      return this.combinedStream;
    } catch (error) {
      console.error('❌ Failed to start dual audio capture:', error);
      this.stopCapture();
      throw error;
    }
  }

  /**
   * Stop all audio capture
   */
  stopCapture() {
    this.isCapturing = false;

    // Stop system audio
    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }

    // Stop microphone
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    // Disconnect audio nodes
    if (this.systemSource) {
      this.systemSource.disconnect();
      this.systemSource = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    // Stop media recorder if active
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.combinedStream = null;

    console.log('⏹️ Audio capture stopped');
  }

  /**
   * Start recording audio to file
   */
  startRecording() {
    if (!this.combinedStream) {
      throw new Error('No active audio stream to record');
    }

    this.recordedChunks = [];

    const options = { mimeType: 'audio/webm;codecs=opus' };
    this.mediaRecorder = new MediaRecorder(this.combinedStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000); // Collect data every 1 second
    console.log('🔴 Recording started');
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        console.log('⏹️ Recording stopped, blob size:', blob.size);
        resolve(blob);
      };

      this.mediaRecorder.onerror = (error) => {
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get combined audio stream for speech recognition
   */
  getCombinedStream() {
    return this.combinedStream;
  }

  /**
   * Get individual streams
   */
  getStreams() {
    return {
      system: this.systemAudioStream,
      microphone: this.microphoneStream,
      combined: this.combinedStream
    };
  }

  /**
   * Get current audio levels
   */
  getAudioLevels() {
    return this.audioLevels;
  }

  /**
   * Set callback for audio level updates
   */
  setAudioLevelCallback(callback) {
    this.onAudioLevelUpdate = callback;
  }

  /**
   * Get available audio input devices
   */
  async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      return audioInputs.map(device => ({
        id: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.substr(0, 8)}`,
        groupId: device.groupId
      }));
    } catch (error) {
      console.error('❌ Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Check if audio capture is supported
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.AudioContext
    );
  }

  /**
   * Check if loopback is available (Electron with audio-loopback)
   */
  static isLoopbackSupported() {
    return window.electronAPI !== undefined;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopCapture();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.destination = null;
    this.onAudioLevelUpdate = null;

    console.log('🗑️ AudioCaptureService destroyed');
  }
}

// Export singleton instance
export default new AudioCaptureService();
