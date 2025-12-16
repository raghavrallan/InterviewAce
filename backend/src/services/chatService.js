const { AzureOpenAI } = require('openai');
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
  constructor() {
    this._openai = null;
  }

  // Lazy initialization of Azure OpenAI client
  get openai() {
    if (!this._openai) {
      this._openai = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT
      });
    }
    return this._openai;
  }

  async generateAnswer({ question, resumeContext, conversationHistory = [] }) {
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
        ...conversationHistory,
        {
          role: 'user',
          content: `Interview Question: ${question}\n\nProvide a natural, first-person answer as if you are the candidate speaking.`
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages,
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI API error:', error);

      // Handle specific error types
      if (error.status === 429 || error.code === 'insufficient_quota' || (error.error && error.error.code === 'insufficient_quota')) {
        const err = new Error('⚠️ OpenAI API Quota Exceeded\n\nYour Azure OpenAI or OpenAI API key has run out of credits.\n\nPlease:\n1. Check your Azure OpenAI quota at portal.azure.com\n2. Or add credits to your OpenAI account at platform.openai.com\n3. Update your API keys in the .env file if needed\n\nThen try again.');
        err.status = 429;
        throw err;
      }

      if (error.status === 401 || error.code === 'invalid_api_key') {
        const err = new Error('⚠️ API Key Invalid\n\nPlease check your Azure OpenAI or OpenAI API key in the .env file.');
        err.status = 401;
        throw err;
      }

      if (error.status === 403) {
        const err = new Error('⚠️ API Access Forbidden\n\nYour API key does not have access to this model. Please check your Azure OpenAI deployment or OpenAI model access.');
        err.status = 403;
        throw err;
      }

      // Include the full error message for debugging
      const err = new Error(`Failed to generate answer: ${error.message || error.toString() || 'Unknown error'}`);
      err.status = error.status || 500;
      throw err;
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

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages,
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI API error:', error);

      // Handle specific error types
      if (error.status === 429 || error.code === 'insufficient_quota' || (error.error && error.error.code === 'insufficient_quota')) {
        const err = new Error('⚠️ OpenAI API Quota Exceeded\n\nYour Azure OpenAI or OpenAI API key has run out of credits.\n\nPlease:\n1. Check your Azure OpenAI quota at portal.azure.com\n2. Or add credits to your OpenAI account at platform.openai.com\n3. Update your API keys in the .env file if needed\n\nThen try again.');
        err.status = 429;
        throw err;
      }

      if (error.status === 401 || error.code === 'invalid_api_key') {
        const err = new Error('⚠️ API Key Invalid\n\nPlease check your Azure OpenAI or OpenAI API key in the .env file.');
        err.status = 401;
        throw err;
      }

      // Include the full error message for debugging
      const err = new Error(`Failed to generate answer: ${error.message || error.toString() || 'Unknown error'}`);
      err.status = error.status || 500;
      throw err;
    }
  }

  async streamAnswer(question, resumeContext, onChunk) {
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
        {
          role: 'user',
          content: `Interview Question: ${question}\n\nProvide a natural, first-person answer.`
        }
      ];

      const stream = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      logger.error('OpenAI streaming error:', error);

      // Handle specific error types
      if (error.status === 429 || error.code === 'insufficient_quota' || (error.error && error.error.code === 'insufficient_quota')) {
        const err = new Error('⚠️ OpenAI API Quota Exceeded - Please add credits and try again.');
        err.status = 429;
        throw err;
      }

      const err = new Error(`Failed to stream answer: ${error.message || error.toString() || 'Unknown error'}`);
      err.status = error.status || 500;
      throw err;
    }
  }
}

module.exports = new ChatService();
