const logger = require('../utils/logger');

class TranscriptService {
  constructor() {
    this.transcriptBuffer = [];
    this.sentenceEndMarkers = /[.!?]+\s+/;
  }

  processTranscript(rawTranscript, speaker = 'Unknown') {
    try {
      // Clean up the transcript
      const cleaned = rawTranscript
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\.{2,}/g, '.') // Fix multiple periods
        .replace(/\s+([,.!?])/g, '$1'); // Fix spacing before punctuation

      return {
        id: Date.now() + Math.random(),
        text: cleaned,
        speaker,
        timestamp: new Date().toISOString(),
        isFinal: true
      };
    } catch (error) {
      logger.error('Transcript processing error:', error);
      throw new Error('Failed to process transcript');
    }
  }

  mergeIntoSentences(chunks) {
    try {
      const sentences = [];
      let currentSentence = '';
      let currentSpeaker = null;
      let sentenceStartTime = null;

      chunks.forEach(chunk => {
        // If speaker changes, finalize current sentence
        if (currentSpeaker && currentSpeaker !== chunk.speaker && currentSentence) {
          sentences.push({
            id: Date.now() + Math.random(),
            text: currentSentence.trim(),
            speaker: currentSpeaker,
            timestamp: sentenceStartTime,
            isFinal: true
          });
          currentSentence = '';
          sentenceStartTime = null;
        }

        // Set speaker and start time
        if (!currentSpeaker) {
          currentSpeaker = chunk.speaker;
          sentenceStartTime = chunk.timestamp;
        }

        // Add chunk to current sentence
        currentSentence += (currentSentence ? ' ' : '') + chunk.text;

        // Check if sentence is complete
        if (this.isSentenceComplete(currentSentence)) {
          sentences.push({
            id: Date.now() + Math.random(),
            text: currentSentence.trim(),
            speaker: currentSpeaker,
            timestamp: sentenceStartTime,
            isFinal: true
          });
          currentSentence = '';
          currentSpeaker = null;
          sentenceStartTime = null;
        }
      });

      // Add remaining text as final sentence
      if (currentSentence.trim()) {
        sentences.push({
          id: Date.now() + Math.random(),
          text: currentSentence.trim(),
          speaker: currentSpeaker,
          timestamp: sentenceStartTime,
          isFinal: true
        });
      }

      return sentences;
    } catch (error) {
      logger.error('Merge sentences error:', error);
      throw new Error('Failed to merge transcript chunks');
    }
  }

  isSentenceComplete(text) {
    // Check for sentence-ending punctuation
    const endsWithPunctuation = /[.!?]$/.test(text.trim());

    // Check for minimum length (avoid breaking on abbreviations)
    const hasMinLength = text.split(' ').length >= 5;

    return endsWithPunctuation && hasMinLength;
  }

  formatTranscriptForDisplay(transcripts) {
    return transcripts.map(t => ({
      ...t,
      formattedTime: new Date(t.timestamp).toLocaleTimeString(),
      preview: t.text.length > 100 ? t.text.substring(0, 100) + '...' : t.text
    }));
  }
}

module.exports = new TranscriptService();
