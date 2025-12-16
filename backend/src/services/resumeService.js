const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { AzureOpenAI } = require('openai');
const logger = require('../utils/logger');

class ResumeService {
  constructor() {
    this.currentResumeContext = null;
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

  async parseResume(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let text = '';

      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);
        text = data.text;
      } else if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (ext === '.txt') {
        text = await fs.readFile(filePath, 'utf-8');
      } else {
        throw new Error('Unsupported file format');
      }

      // Store the resume context
      this.currentResumeContext = text;

      return {
        text,
        metadata: {
          filename: path.basename(filePath),
          size: (await fs.stat(filePath)).size,
          uploadedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Resume parsing error:', error);
      throw new Error('Failed to parse resume');
    }
  }

  async generateResumeSummary(resumeText) {
    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing resumes. Provide a concise summary of the candidate\'s key skills, experience, and qualifications.'
          },
          {
            role: 'user',
            content: `Analyze this resume and provide a summary:\n\n${resumeText}`
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Resume summary generation error:', error);

      // Handle quota exceeded error
      if (error.status === 429) {
        return '⚠️ OpenAI API Quota Exceeded\n\nYour OpenAI API key has run out of credits. Please:\n1. Go to platform.openai.com\n2. Add credits to your account\n3. Try uploading your resume again\n\nThe resume was still uploaded successfully - you just won\'t get the AI summary until credits are added.';
      }

      // Extract first few lines as basic summary
      const lines = resumeText.split('\n').filter(l => l.trim()).slice(0, 5);
      return `Resume uploaded successfully!\n\n${lines.join('\n')}\n\n⚠️ AI Summary unavailable: ${error.message || 'Unknown error'}`;
    }
  }

  getStoredResumeContext() {
    return {
      context: this.currentResumeContext,
      available: !!this.currentResumeContext
    };
  }

  clearResumeContext() {
    this.currentResumeContext = null;
  }
}

module.exports = new ResumeService();
