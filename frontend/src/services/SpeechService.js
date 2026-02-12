/**
 * SpeechService - TTS wrapper around browser SpeechSynthesis API
 *
 * Usage:
 *   import SpeechService from '../services/SpeechService';
 *   SpeechService.speak('Hello world', { rate: 1.0 });
 *   SpeechService.stop();
 */

class SpeechServiceClass {
  constructor() {
    this._synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this._currentUtterance = null;
    this._isSpeaking = false;
    this._voices = [];
    this._onVoicesLoaded = null;

    // Load voices (they load async in some browsers)
    if (this._synth) {
      this._loadVoices();
      this._synth.addEventListener('voiceschanged', () => this._loadVoices());
    }
  }

  /**
   * Check if SpeechSynthesis is supported
   */
  isSupported() {
    return !!this._synth;
  }

  /**
   * Load available voices
   */
  _loadVoices() {
    if (this._synth) {
      this._voices = this._synth.getVoices();
      if (this._onVoicesLoaded) {
        this._onVoicesLoaded(this._voices);
      }
    }
  }

  /**
   * Get all available voices
   * @returns {SpeechSynthesisVoice[]}
   */
  getVoices() {
    if (this._synth) {
      // Try to get voices directly (may be populated already)
      const voices = this._synth.getVoices();
      if (voices.length > 0) {
        this._voices = voices;
      }
    }
    return this._voices;
  }

  /**
   * Set callback for when voices are loaded
   */
  onVoicesLoaded(callback) {
    this._onVoicesLoaded = callback;
    // If voices already loaded, call immediately
    if (this._voices.length > 0) {
      callback(this._voices);
    }
  }

  /**
   * Get a voice by name
   * @param {string} voiceName
   * @returns {SpeechSynthesisVoice|null}
   */
  getVoiceByName(voiceName) {
    return this._voices.find(v => v.name === voiceName) || null;
  }

  /**
   * Speak text aloud
   * @param {string} text - Text to speak
   * @param {Object} options - { voice, rate, pitch, volume, onEnd, onStart }
   */
  speak(text, options = {}) {
    if (!this._synth || !text?.trim()) return;

    // Cancel any current speech
    this.stop();

    // Strip markdown formatting for cleaner speech
    const cleanText = this._stripMarkdown(text);

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Set voice
    if (options.voice) {
      const voice = typeof options.voice === 'string'
        ? this.getVoiceByName(options.voice)
        : options.voice;
      if (voice) utterance.voice = voice;
    }

    // Set properties
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Event handlers
    utterance.onstart = () => {
      this._isSpeaking = true;
      this._currentUtterance = utterance;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this._isSpeaking = false;
      this._currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (event) => {
      this._isSpeaking = false;
      this._currentUtterance = null;
      console.error('Speech synthesis error:', event.error);
      if (options.onError) options.onError(event);
    };

    this._synth.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this._synth) {
      this._synth.cancel();
      this._isSpeaking = false;
      this._currentUtterance = null;
    }
  }

  /**
   * Pause current speech
   */
  pause() {
    if (this._synth) {
      this._synth.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume() {
    if (this._synth) {
      this._synth.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  get isSpeaking() {
    return this._isSpeaking || (this._synth?.speaking ?? false);
  }

  /**
   * Strip markdown formatting for cleaner TTS output
   */
  _stripMarkdown(text) {
    return text
      .replace(/#{1,6}\s/g, '')          // headers
      .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
      .replace(/\*(.+?)\*/g, '$1')       // italic
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // code blocks
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
      .replace(/^[-*+]\s/gm, '')         // list markers
      .replace(/^\d+\.\s/gm, '')         // numbered lists
      .replace(/>\s/g, '')               // blockquotes
      .replace(/\n{2,}/g, '. ')          // multiple newlines -> pause
      .replace(/\n/g, ' ')              // single newlines -> space
      .trim();
  }
}

// Export singleton
const SpeechService = new SpeechServiceClass();
export default SpeechService;
