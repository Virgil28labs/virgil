const fetch = require('node-fetch');
const { EventEmitter } = require('events');

class LLMProxy extends EventEmitter {
  constructor() {
    super();
    this.providers = {
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: () => ({
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }),
        models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview']
      },
      anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        headers: () => ({
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }),
        models: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus']
      },
      ollama: {
        url: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`,
        headers: () => ({
          'Content-Type': 'application/json'
        }),
        models: ['llama2', 'mistral', 'codellama']
      }
    };
  }

  async complete(options) {
    const {
      messages,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      provider = 'openai',
      stream = false
    } = options;

    const startTime = Date.now();

    try {
      // Format messages with system prompt if provided
      const formattedMessages = this.formatMessages(messages, systemPrompt);
      
      // Get provider configuration
      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Build request body based on provider
      const requestBody = this.buildRequestBody(provider, {
        messages: formattedMessages,
        model,
        temperature,
        maxTokens,
        stream
      });

      // Make the request
      const response = await fetch(providerConfig.url, {
        method: 'POST',
        headers: providerConfig.headers(),
        body: JSON.stringify(requestBody),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Parse response based on provider
      const result = this.parseResponse(provider, data);

      // Emit analytics event
      this.emit('request', {
        provider,
        model,
        latency,
        tokens: result.usage?.total_tokens || 0
      });

      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Emit error event
      this.emit('error', {
        provider,
        model,
        error: error.message,
        latency
      });

      throw error;
    }
  }

  async *completeStream(options) {
    const {
      messages,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      provider = 'openai'
    } = options;

    try {
      const formattedMessages = this.formatMessages(messages, systemPrompt);
      const providerConfig = this.providers[provider];
      
      if (!providerConfig) {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const requestBody = this.buildRequestBody(provider, {
        messages: formattedMessages,
        model,
        temperature,
        maxTokens,
        stream: true
      });

      const response = await fetch(providerConfig.url, {
        method: 'POST',
        headers: providerConfig.headers(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${error}`);
      }

      // Stream parsing logic based on provider
      if (provider === 'openai') {
        yield* this.parseOpenAIStream(response.body);
      } else if (provider === 'anthropic') {
        yield* this.parseAnthropicStream(response.body);
      } else {
        yield* this.parseGenericStream(response.body);
      }

    } catch (error) {
      this.emit('error', {
        provider,
        model,
        error: error.message
      });
      throw error;
    }
  }

  formatMessages(messages, systemPrompt) {
    if (!systemPrompt) return messages;

    // Check if first message is already a system message
    if (messages[0]?.role === 'system') {
      return messages;
    }

    // Prepend system prompt
    return [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
  }

  buildRequestBody(provider, options) {
    const { messages, model, temperature, maxTokens, stream } = options;

    switch (provider) {
      case 'openai':
        return {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream
        };

      case 'anthropic':
        // Convert to Anthropic format
        const systemMessage = messages.find(m => m.role === 'system');
        const nonSystemMessages = messages.filter(m => m.role !== 'system');
        
        return {
          model,
          messages: nonSystemMessages,
          system: systemMessage?.content,
          max_tokens: maxTokens,
          temperature,
          stream
        };

      case 'ollama':
        return {
          model,
          messages,
          options: {
            temperature,
            num_predict: maxTokens
          },
          stream
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  parseResponse(provider, data) {
    switch (provider) {
      case 'openai':
        return {
          content: data.choices[0].message.content,
          usage: data.usage,
          model: data.model,
          finish_reason: data.choices[0].finish_reason
        };

      case 'anthropic':
        return {
          content: data.content[0].text,
          usage: {
            prompt_tokens: data.usage.input_tokens,
            completion_tokens: data.usage.output_tokens,
            total_tokens: data.usage.input_tokens + data.usage.output_tokens
          },
          model: data.model,
          finish_reason: data.stop_reason
        };

      case 'ollama':
        return {
          content: data.message.content,
          usage: {
            total_tokens: data.eval_count || 0
          },
          model: data.model,
          finish_reason: 'stop'
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async *parseOpenAIStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield { content, done: false };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *parseAnthropicStream(stream) {
    // Similar implementation for Anthropic streaming
    // ... implementation details ...
  }

  async *parseGenericStream(stream) {
    // Generic streaming implementation
    // ... implementation details ...
  }

  async getAvailableModels() {
    const models = {};
    
    for (const [provider, config] of Object.entries(this.providers)) {
      // Check if provider is configured
      const isConfigured = provider === 'ollama' || 
        (provider === 'openai' && process.env.OPENAI_API_KEY) ||
        (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY);
      
      if (isConfigured) {
        models[provider] = config.models;
      }
    }

    return models;
  }

  async countTokens(text, model = 'gpt-4o-mini') {
    // Simple token estimation (more accurate methods can be implemented)
    // Average: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
}

module.exports = { LLMProxy };