const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class TranscriptService {
  constructor() {
    this.transcriptBuffer = [];
    this.sentenceEndMarkers = /[.!?]+\s+/;
    this.sessionsDir = path.join(__dirname, '../../uploads/transcripts');
    try {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    } catch (err) {
      logger.error('Could not create transcripts directory:', err);
    }
  }

  _sanitizeId(id) {
    return String(id || '').replace(/[^0-9a-zA-Z_-]/g, '');
  }

  _sessionPath(id) {
    return path.join(this.sessionsDir, `${this._sanitizeId(id)}.json`);
  }

  /**
   * Persist an interview session (transcripts + AI messages) to disk as JSON.
   */
  saveSession({ transcripts = [], messages = [], startedAt = null, endedAt = null, meta = {} } = {}) {
    const finals = (transcripts || []).filter(t => t.isFinal !== false);
    const id = String(Date.now());
    const session = {
      id,
      startedAt: startedAt || (finals[0] && finals[0].timestamp) || new Date().toISOString(),
      endedAt: endedAt || new Date().toISOString(),
      lineCount: finals.length,
      messageCount: (messages || []).length,
      meta,
      transcripts: finals,
      messages: messages || [],
    };
    fs.writeFileSync(this._sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
    logger.info(`Saved interview session ${id} (${finals.length} lines)`);
    return { id, startedAt: session.startedAt, endedAt: session.endedAt, lineCount: session.lineCount };
  }

  listSessions() {
    let files = [];
    try {
      files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
    } catch (err) {
      return [];
    }
    const sessions = files.map((file) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8'));
        const firstLine = (data.transcripts || [])[0];
        return {
          id: data.id,
          startedAt: data.startedAt,
          endedAt: data.endedAt,
          lineCount: data.lineCount ?? (data.transcripts || []).length,
          messageCount: data.messageCount ?? (data.messages || []).length,
          preview: firstLine ? `${firstLine.speaker || 'Speaker'}: ${firstLine.text}`.slice(0, 120) : '(empty)',
        };
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
    sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return sessions;
  }

  getSession(id) {
    const p = this._sessionPath(id);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }

  /**
   * Render a saved session as human-readable text.
   * @param {Object} session
   * @param {'md'|'txt'} format
   */
  formatSession(session, format = 'md') {
    const { startedAt, endedAt, transcripts = [], messages = [] } = session;
    const full = (ts) => (ts ? new Date(ts).toLocaleString() : 'Unknown');
    const hm = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

    if (format === 'txt') {
      let out = `Interview Transcript\nDate: ${full(startedAt)}\n`;
      if (endedAt) out += `Ended: ${full(endedAt)}\n`;
      out += `\n--- Conversation ---\n`;
      for (const t of transcripts) {
        if (t.isFinal === false) continue;
        out += `[${hm(t.timestamp)}] ${t.speaker || 'Speaker'}: ${t.text}\n`;
      }
      if (messages.length) {
        out += `\n--- AI Answers ---\n`;
        for (const m of messages) {
          out += `[${hm(m.timestamp)}] ${m.type === 'user' ? 'Q' : 'AI'}: ${m.text}\n`;
        }
      }
      return out;
    }

    let out = `# Interview Transcript\n\n- **Date:** ${full(startedAt)}\n`;
    if (endedAt) out += `- **Ended:** ${full(endedAt)}\n`;
    out += `\n## Conversation\n\n`;
    for (const t of transcripts) {
      if (t.isFinal === false) continue;
      out += `**[${hm(t.timestamp)}] ${t.speaker || 'Speaker'}:** ${t.text}\n\n`;
    }
    if (messages.length) {
      out += `## AI Answers\n\n`;
      for (const m of messages) {
        out += `**${m.type === 'user' ? 'Question' : 'AI Answer'} (${hm(m.timestamp)}):**\n\n${m.text}\n\n`;
      }
    }
    return out;
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
