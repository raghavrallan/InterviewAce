const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const CODE_FORMATTING = `**Code formatting:**
- For any code, ALWAYS use fenced markdown blocks with the correct language tag (\`\`\`javascript, \`\`\`python, \`\`\`java, \`\`\`sql, ...).
- Use single backticks for inline identifiers like \`functionName()\`.`;

// Detailed answer: accurate, complete, well-structured — but NOT padded or exaggerated.
const DETAILED_SYSTEM_PROMPT = `You are an expert interview assistant. The candidate is in a live interview and needs the strongest possible answer to the question that was actually asked.

How to answer:
1. READ THE QUESTION CAREFULLY and answer exactly what is being asked. Do not answer a different, easier question.
2. Speak in the first person (I, my, me) as the candidate.
3. Be genuinely detailed and substantive: give the real reasoning, concrete specifics, trade-offs, and at least one concrete example from the candidate's resume/experience when relevant.
4. Match depth to the question. A simple factual question gets a tight focused answer; a system-design / "tell me about a time" / technical-deep-dive question gets a thorough multi-part answer with clear structure (short headers or bullets where it helps).
5. For coding questions, give a correct, working solution with a fenced code block, then briefly explain the approach and its time/space complexity.

Hard rules:
- Be accurate. Never invent facts about the candidate that aren't supported by the resume; if something isn't in the resume, speak generally from relevant experience instead of fabricating specifics.
- Do NOT pad, do NOT exaggerate, do NOT repeat the question back, and do NOT add fluff like "Great question". Every sentence should add real value.
- Sound like a confident, competent human — natural and conversational, not robotic or buzzword-stuffed.

${CODE_FORMATTING}`;

// Quick "cue card": an instant 2-3 line gist the candidate can start saying immediately.
const QUICK_SYSTEM_PROMPT = `You are giving the candidate an INSTANT cue card while a fuller answer is still being prepared.

Output ONLY a 2-3 line gist of how to answer — the core point(s) they can start saying right away. Adapt to the question:
- Behavioral / "tell me about a time": the one-line situation + the key result.
- Conceptual / "what is / explain": the crisp definition or the core idea in one or two lines.
- Coding: the key idea or approach in one line, plus a minimal code stub/signature if it helps.

Rules: No greetings, no preamble, no "Sure"/"Great question", no headings. Be direct, first-person, and concrete. This is a fast cue, not the full answer — keep it to 2-3 short lines.

${CODE_FORMATTING}`;

const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', hi: 'Hindi', pt: 'Portuguese', ar: 'Arabic', ru: 'Russian',
};

class ChatService {
  _languageName(language) {
    return LANGUAGE_NAMES[language] || 'English';
  }

  /**
   * Build an OpenAI-style message array. The aiProvider converts this to the
   * right shape for whichever provider (Azure/OpenAI/Claude) is active.
   */
  _buildMessages({ systemPrompt, resumeContext, language, conversationHistory = [], userContent }) {
    const targetLanguage = this._languageName(language);
    return [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `Candidate's Resume Context:\n${resumeContext || 'No resume uploaded yet'}` },
      { role: 'system', content: `IMPORTANT: Respond in ${targetLanguage}.` },
      ...conversationHistory,
      { role: 'user', content: userContent },
    ];
  }

  async generateAnswer({ question, resumeContext, conversationHistory = [], language = 'en' }) {
    try {
      const messages = this._buildMessages({
        systemPrompt: DETAILED_SYSTEM_PROMPT,
        resumeContext,
        language,
        conversationHistory,
        userContent: `Interview question: ${question}\n\nGive your full first-person answer.`,
      });

      const response = await aiProvider.chat(messages, { temperature: 0.6, max_tokens: 900 });
      return aiProvider.getContent(response);
    } catch (error) {
      logger.error('Chat service error:', error);
      throw error;
    }
  }

  async generateAnswerFromTranscript({ transcriptText, resumeContext, previousContext = [] }) {
    try {
      const messages = this._buildMessages({
        systemPrompt: DETAILED_SYSTEM_PROMPT,
        resumeContext,
        language: 'en',
        conversationHistory: previousContext,
        userContent: `The interviewer said: "${transcriptText}"\n\nIf it is a question, answer it fully in the first person. If it is a statement, respond appropriately as the candidate.`,
      });

      const response = await aiProvider.chat(messages, { temperature: 0.6, max_tokens: 900 });
      return aiProvider.getContent(response);
    } catch (error) {
      logger.error('Chat service transcript error:', error);
      throw error;
    }
  }

  /**
   * Stream a single detailed answer. Kept for backward compatibility.
   */
  async streamAnswer(question, resumeContext, conversationHistory = [], language = 'en', onChunk) {
    const messages = this._buildMessages({
      systemPrompt: DETAILED_SYSTEM_PROMPT,
      resumeContext,
      language,
      conversationHistory,
      userContent: `Interview question: ${question}\n\nGive your full first-person answer.`,
    });

    const stream = await aiProvider.chatStream(messages, { temperature: 0.6, max_tokens: 900 });
    for await (const chunk of stream) {
      const delta = aiProvider.getStreamDelta(chunk);
      if (delta) onChunk(delta);
    }
  }

  /**
   * Two-phase streaming: first emit a fast 2-3 line "quick" cue, then stream the
   * full detailed answer. onChunk is called as onChunk(phase, text) where phase
   * is 'quick' or 'detailed'.
   */
  async streamTwoPhaseAnswer({ question, resumeContext, conversationHistory = [], language = 'en' }, onChunk) {
    const userContent = `Interview question: ${question}`;

    // ---- Phase 1: quick cue (fast, short) ----
    try {
      const quickMessages = this._buildMessages({
        systemPrompt: QUICK_SYSTEM_PROMPT,
        resumeContext,
        language,
        conversationHistory,
        userContent: `${userContent}\n\nGive only the 2-3 line instant cue.`,
      });
      const quickStream = await aiProvider.chatStream(quickMessages, { temperature: 0.4, max_tokens: 160 });
      for await (const chunk of quickStream) {
        const delta = aiProvider.getStreamDelta(chunk);
        if (delta) onChunk('quick', delta);
      }
    } catch (error) {
      // A failure in the quick phase shouldn't block the real answer.
      logger.error('Quick-phase streaming error (continuing to detailed):', error);
    }

    // ---- Phase 2: detailed answer ----
    const detailedMessages = this._buildMessages({
      systemPrompt: DETAILED_SYSTEM_PROMPT,
      resumeContext,
      language,
      conversationHistory,
      userContent: `${userContent}\n\nNow give your full, detailed first-person answer.`,
    });
    const detailedStream = await aiProvider.chatStream(detailedMessages, { temperature: 0.6, max_tokens: 900 });
    for await (const chunk of detailedStream) {
      const delta = aiProvider.getStreamDelta(chunk);
      if (delta) onChunk('detailed', delta);
    }
  }
}

module.exports = new ChatService();
