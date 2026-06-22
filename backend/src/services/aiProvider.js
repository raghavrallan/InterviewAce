/**
 * AI Provider Service - Centralized AI client management
 * Supports multiple providers: OpenAI, Azure OpenAI
 *
 * Usage:
 *   const aiProvider = require('./aiProvider');
 *   const response = await aiProvider.chat(messages, options);
 */

const { OpenAI, AzureOpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

// Normalize provider aliases to canonical names
const PROVIDER_ALIASES = {
  claude: 'anthropic',
  anthropic: 'anthropic',
  azure: 'azure',
  openai: 'openai',
};

class AIProvider {
  constructor() {
    this._client = null;
    this._provider = null;
    this._model = null;
  }

  /**
   * Get the current provider type (auto-detects from env vars if AI_PROVIDER not set)
   */
  get provider() {
    if (!this._provider) {
      const explicit = process.env.AI_PROVIDER;
      if (explicit) {
        this._provider = PROVIDER_ALIASES[explicit.toLowerCase()] || explicit.toLowerCase();
      } else if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
        // Auto-detect Azure if Azure keys are present
        this._provider = 'azure';
        logger.info('Auto-detected AI provider: azure (AZURE_OPENAI_* env vars found)');
      } else if (this._anthropicKey()) {
        this._provider = 'anthropic';
        logger.info('Auto-detected AI provider: anthropic (Claude key found)');
      } else if (process.env.OPENAI_API_KEY) {
        this._provider = 'openai';
        logger.info('Auto-detected AI provider: openai (OPENAI_API_KEY found)');
      } else {
        // Default to azure if any azure vars exist, otherwise openai
        this._provider = process.env.AZURE_OPENAI_ENDPOINT ? 'azure' : 'openai';
      }
    }
    return this._provider;
  }

  /**
   * Resolve the Anthropic/Claude API key from supported env var names
   */
  _anthropicKey() {
    return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.claude_key || null;
  }

  /**
   * Switch the active provider at runtime (e.g. from a settings toggle).
   * Resets the cached client so the next call uses the new provider.
   */
  setProvider(name) {
    const canonical = PROVIDER_ALIASES[(name || '').toLowerCase()];
    if (!canonical) {
      throw new Error(`Unknown AI provider: ${name}. Supported: openai, azure, claude`);
    }
    if (!this.availableProviders().includes(canonical)) {
      throw new Error(`Provider "${canonical}" is not configured. Check the required API keys in .env`);
    }
    this._provider = canonical;
    this._client = null;
    this._model = null;
    logger.info(`AI provider switched to: ${canonical}`);
    return canonical;
  }

  /**
   * List which providers have the required credentials configured
   */
  availableProviders() {
    const list = [];
    if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT) {
      list.push('azure');
    }
    if (process.env.OPENAI_API_KEY) list.push('openai');
    if (this._anthropicKey()) list.push('anthropic');
    return list;
  }

  /**
   * Get the model/deployment name to use
   */
  get model() {
    if (!this._model) {
      if (this.provider === 'azure') {
        this._model = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_MODEL || 'gpt-4o-mini';
      } else if (this.provider === 'anthropic') {
        this._model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
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
    } else if (provider === 'anthropic') {
      return this._initializeAnthropic();
    } else {
      throw new Error(`Unsupported AI provider: ${provider}. Supported: openai, azure, claude`);
    }
  }

  /**
   * Initialize Anthropic (Claude) client
   */
  _initializeAnthropic() {
    const apiKey = this._anthropicKey();
    if (!apiKey) {
      throw new Error('Claude configuration missing. Required: ANTHROPIC_API_KEY (or claude_key) in .env');
    }
    logger.info(`Anthropic (Claude) configured - Model: ${this.model}`);
    return new Anthropic({ apiKey });
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
  /**
   * Convert OpenAI-style messages (with role:'system') into Anthropic format.
   * Anthropic takes a top-level `system` string and messages limited to user/assistant.
   * @returns {{ system: string, messages: Array }}
   */
  _toAnthropicMessages(messages) {
    const systemParts = [];
    const converted = [];
    for (const m of messages) {
      if (m.role === 'system') {
        systemParts.push(m.content);
      } else {
        converted.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
      }
    }
    // Anthropic requires the first message to be from the user
    if (converted.length === 0 || converted[0].role !== 'user') {
      converted.unshift({ role: 'user', content: '(begin)' });
    }
    return { system: systemParts.join('\n\n'), messages: converted };
  }

  async chat(messages, options = {}) {
    try {
      if (this.provider === 'anthropic') {
        const { system, messages: aMessages } = this._toAnthropicMessages(messages);
        const response = await this.client.messages.create({
          model: this.model,
          system,
          messages: aMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 500,
        });
        return response;
      }

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
      if (this.provider === 'anthropic') {
        const { system, messages: aMessages } = this._toAnthropicMessages(messages);
        const stream = await this.client.messages.create({
          model: this.model,
          system,
          messages: aMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 500,
          stream: true,
        });
        return stream;
      }

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
   * Extract the incremental text from a stream chunk, provider-agnostic.
   * @returns {string} delta text (empty string if none)
   */
  getStreamDelta(chunk) {
    if (this.provider === 'anthropic') {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        return chunk.delta.text || '';
      }
      return '';
    }
    return chunk.choices?.[0]?.delta?.content || '';
  }

  /**
   * Get the content from a chat response
   * @param {Object} response - The chat completion response
   * @returns {string} - The message content
   */
  getContent(response) {
    if (this.provider === 'anthropic') {
      const block = response.content?.find(b => b.type === 'text');
      return block?.text || '';
    }
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Handle API errors with user-friendly messages
   */
  _providerLabel() {
    if (this.provider === 'azure') return 'Azure OpenAI';
    if (this.provider === 'anthropic') return 'Anthropic Claude';
    return 'OpenAI';
  }

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
      initialized: !!this._client,
      available: this.availableProviders()
    };
  }
}

// Export singleton instance
module.exports = new AIProvider();
