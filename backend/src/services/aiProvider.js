/**
 * AI Provider Service - Centralized AI client management
 * Supports multiple providers: OpenAI, Azure OpenAI
 *
 * Usage:
 *   const aiProvider = require('./aiProvider');
 *   const response = await aiProvider.chat(messages, options);
 */

const { OpenAI, AzureOpenAI } = require('openai');
const logger = require('../utils/logger');

class AIProvider {
  constructor() {
    this._client = null;
    this._provider = null;
    this._model = null;
  }

  /**
   * Get the current provider type
   */
  get provider() {
    if (!this._provider) {
      this._provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    }
    return this._provider;
  }

  /**
   * Get the model/deployment name to use
   */
  get model() {
    if (!this._model) {
      if (this.provider === 'azure') {
        this._model = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_MODEL || 'gpt-4o-mini';
      } else {
        this._model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      }
    }
    return this._model;
  }

  /**
   * Initialize and return the AI client (lazy initialization)
   */
  get client() {
    if (!this._client) {
      this._client = this._initializeClient();
    }
    return this._client;
  }

  /**
   * Initialize the appropriate AI client based on provider
   */
  _initializeClient() {
    const provider = this.provider;

    logger.info(`Initializing AI Provider: ${provider}`);

    if (provider === 'azure') {
      return this._initializeAzure();
    } else if (provider === 'openai') {
      return this._initializeOpenAI();
    } else {
      throw new Error(`Unsupported AI provider: ${provider}. Supported: openai, azure`);
    }
  }

  /**
   * Initialize Azure OpenAI client
   */
  _initializeAzure() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !apiKey || !deployment) {
      throw new Error(
        'Azure OpenAI configuration missing. Required: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT'
      );
    }

    logger.info(`Azure OpenAI configured - Endpoint: ${endpoint}, Deployment: ${deployment}`);

    return new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
      deployment
    });
  }

  /**
   * Initialize OpenAI client
   */
  _initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI configuration missing. Required: OPENAI_API_KEY');
    }

    logger.info(`OpenAI configured - Model: ${this.model}`);

    return new OpenAI({
      apiKey
    });
  }

  /**
   * Create a chat completion
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<Object>} - The completion response
   */
  async chat(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 500,
        ...options
      });

      return response;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Create a streaming chat completion
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Additional options
   * @returns {AsyncIterable} - Stream of completion chunks
   */
  async chatStream(messages, options = {}) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 500,
        stream: true,
        ...options
      });

      return stream;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Get the content from a chat response
   * @param {Object} response - The chat completion response
   * @returns {string} - The message content
   */
  getContent(response) {
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Handle API errors with user-friendly messages
   */
  _handleError(error) {
    logger.error(`AI Provider Error (${this.provider}):`, error);

    // Quota exceeded
    if (error.status === 429 || error.code === 'insufficient_quota' ||
        (error.error && error.error.code === 'insufficient_quota')) {
      const err = new Error(
        `⚠️ AI API Quota Exceeded\n\n` +
        `Your ${this.provider === 'azure' ? 'Azure OpenAI' : 'OpenAI'} API has run out of credits.\n\n` +
        `Please:\n` +
        `1. ${this.provider === 'azure' ? 'Check your Azure OpenAI quota at portal.azure.com' : 'Add credits at platform.openai.com'}\n` +
        `2. Update your API keys in the .env file if needed\n\n` +
        `Then restart the server and try again.`
      );
      err.status = 429;
      throw err;
    }

    // Invalid API key
    if (error.status === 401 || error.code === 'invalid_api_key') {
      const err = new Error(
        `⚠️ API Key Invalid\n\n` +
        `Please check your ${this.provider === 'azure' ? 'Azure OpenAI' : 'OpenAI'} API key in the .env file.`
      );
      err.status = 401;
      throw err;
    }

    // Access forbidden
    if (error.status === 403) {
      const err = new Error(
        `⚠️ API Access Forbidden\n\n` +
        `Your API key does not have access to the model "${this.model}".\n` +
        `Please check your ${this.provider === 'azure' ? 'Azure OpenAI deployment' : 'OpenAI model access'}.`
      );
      err.status = 403;
      throw err;
    }

    // Model not found (Azure specific)
    if (error.status === 404 || error.code === 'DeploymentNotFound') {
      const err = new Error(
        `⚠️ Model/Deployment Not Found\n\n` +
        `The model "${this.model}" was not found.\n` +
        `${this.provider === 'azure' ?
          'Please check your AZURE_OPENAI_DEPLOYMENT in the .env file.' :
          'Please check your OPENAI_MODEL in the .env file.'}`
      );
      err.status = 404;
      throw err;
    }

    // Generic error
    const err = new Error(`AI request failed: ${error.message || error.toString() || 'Unknown error'}`);
    err.status = error.status || 500;
    throw err;
  }

  /**
   * Reset the client (useful for testing or config changes)
   */
  reset() {
    this._client = null;
    this._provider = null;
    this._model = null;
    logger.info('AI Provider reset');
  }

  /**
   * Get provider info (for debugging/status)
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.model,
      initialized: !!this._client
    };
  }
}

// Export singleton instance
module.exports = new AIProvider();
