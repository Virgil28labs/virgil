const validateRequest = (req, res, next) => {
  const { messages, model, temperature, maxTokens } = req.body;

  // Validate messages
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Messages array is required and must not be empty',
    });
  }

  // Validate message format
  for (const message of messages) {
    if (!message.role || !message.content) {
      return res.status(400).json({
        error: 'Each message must have role and content properties',
      });
    }

    if (!['system', 'user', 'assistant'].includes(message.role)) {
      return res.status(400).json({
        error: 'Message role must be system, user, or assistant',
      });
    }

    if (typeof message.content !== 'string') {
      return res.status(400).json({
        error: 'Message content must be a string',
      });
    }
  }

  // Validate temperature
  if (temperature !== undefined) {
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return res.status(400).json({
        error: 'Temperature must be a number between 0 and 2',
      });
    }
  }

  // Validate maxTokens
  if (maxTokens !== undefined) {
    if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4096) {
      return res.status(400).json({
        error: 'Max tokens must be a number between 1 and 4096',
      });
    }
  }

  // Validate model
  if (model) {
    const validModels = [
      'gpt-4o-mini',
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo-preview',
      'claude-3-haiku',
      'claude-3-sonnet',
      'claude-3-opus',
      'llama2',
      'mistral',
      'codellama',
    ];

    if (!validModels.includes(model)) {
      return res.status(400).json({
        error: `Invalid model. Valid models are: ${validModels.join(', ')}`,
      });
    }
  }

  next();
};

const validateBatchRequest = (req, res, next) => {
  const { requests } = req.body;

  if (!requests || !Array.isArray(requests)) {
    return res.status(400).json({
      error: 'Requests must be an array',
    });
  }

  if (requests.length === 0) {
    return res.status(400).json({
      error: 'Requests array must not be empty',
    });
  }

  if (requests.length > 10) {
    return res.status(400).json({
      error: 'Batch size cannot exceed 10 requests',
    });
  }

  // Validate each request
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    const validation = validateSingleRequest(request);

    if (validation.error) {
      return res.status(400).json({
        error: `Request ${i}: ${validation.error}`,
      });
    }
  }

  next();
};

function validateSingleRequest(request) {
  if (!request.messages || !Array.isArray(request.messages)) {
    return { error: 'Messages array is required' };
  }

  for (const message of request.messages) {
    if (!message.role || !message.content) {
      return { error: 'Each message must have role and content' };
    }
  }

  return { success: true };
}

module.exports = {
  validateRequest,
  validateBatchRequest,
};
