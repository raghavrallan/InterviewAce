const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are an intelligent interview assistant helping a candidate answer interview questions.

Your role is to:
1. Generate answers that sound natural and conversational, as if the candidate is speaking
2. Base answers on the candidate's resume and experience
3. Keep answers concise, relevant, and professional
4. Use first-person perspective (I, my, me)
5. Match the candidate's communication style
6. Include specific examples from their experience when possible

**IMPORTANT - Code Formatting:**
- When answering coding questions or providing technical examples, ALWAYS format code using markdown code blocks
- Use proper syntax highlighting: \`\`\`javascript, \`\`\`python, \`\`\`java, etc.
- For inline code references, use single backticks: \`functionName()\`
- Example:
  "I would use a binary search algorithm like this:
  \`\`\`javascript
  function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === target) return mid;
      if (arr[mid] < target) left = mid + 1;
      else right = mid - 1;
    }
    return -1;
  }
  \`\`\`
  This approach has O(log n) time complexity."

Important guidelines:
- Answer in 2-6 sentences for most questions
- Be confident but not arrogant
- For technical questions, provide clear explanations with code examples
- If you don't have information from the resume, acknowledge it briefly and pivot to relevant experience
- Structure complex answers with clear sections or bullet points when needed
- Always use proper markdown formatting for readability`;

class ChatService {
  async generateAnswer({ question, resumeContext, conversationHistory = [], language = 'en' }) {
    try {
      // Language mapping for natural language names
      const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'hi': 'Hindi',
        'pt': 'Portuguese',
        'ar': 'Arabic',
        'ru': 'Russian'
      };

      const targetLanguage = languageNames[language] || 'English';

      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'system',
          content: `Candidate's Resume Context:\n${resumeContext || 'No resume uploaded yet'}`
        },
        {
          role: 'system',
          content: `IMPORTANT: Respond in ${targetLanguage}. The candidate needs the answer in ${targetLanguage}.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: `Interview Question: ${question}\n\nProvide a natural, first-person answer as if you are the candidate speaking, in ${targetLanguage}.`
        }
      ];

      const response = await aiProvider.chat(messages, {
        temperature: 0.7,
        max_tokens: 500
      });

      return aiProvider.getContent(response);
    } catch (error) {
      logger.error('Chat service error:', error);
      throw error; // aiProvider already handles error formatting
    }
  }

  async generateAnswerFromTranscript({ transcriptText, resumeContext, previousContext = [] }) {
    try {
      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'system',
          content: `Candidate's Resume Context:\n${resumeContext || 'No resume uploaded yet'}`
        },
        ...previousContext,
        {
          role: 'user',
          content: `The interviewer said: "${transcriptText}"\n\nGenerate an appropriate response as if you are the candidate. If it's a question, answer it. If it's a statement, respond appropriately.`
        }
      ];

      const response = await aiProvider.chat(messages, {
        temperature: 0.7,
        max_tokens: 500
      });

      return aiProvider.getContent(response);
    } catch (error) {
      logger.error('Chat service transcript error:', error);
      throw error;
    }
  }

  async streamAnswer(question, resumeContext, conversationHistory = [], language = 'en', onChunk) {
    try {
      // Language mapping for natural language names
      const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'hi': 'Hindi',
        'pt': 'Portuguese',
        'ar': 'Arabic',
        'ru': 'Russian'
      };

      const targetLanguage = languageNames[language] || 'English';

      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'system',
          content: `Candidate's Resume Context:\n${resumeContext || 'No resume uploaded yet'}`
        },
        {
          role: 'system',
          content: `IMPORTANT: Respond in ${targetLanguage}. The candidate needs the answer in ${targetLanguage}.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: `Interview Question: ${question}\n\nProvide a natural, first-person answer as if you are the candidate speaking, in ${targetLanguage}.`
        }
      ];

      const stream = await aiProvider.chatStream(messages, {
        temperature: 0.7,
        max_tokens: 500
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      logger.error('Chat service streaming error:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();
