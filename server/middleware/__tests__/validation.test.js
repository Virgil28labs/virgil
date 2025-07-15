const { validateRequest, validateBatchRequest } = require('../validation');
const express = require('express');
const request = require('supertest');

describe('validateRequest', () => {
  let app;
  let mockHandler;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockHandler = jest.fn((req, res) => res.json({ success: true }));
    
    app.post('/test', validateRequest, mockHandler);
  });

  describe('messages validation', () => {
    it('should pass valid messages', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ]
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject missing messages', async () => {
      const response = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Messages array is required and must not be empty'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should reject non-array messages', async () => {
      const response = await request(app)
        .post('/test')
        .send({ messages: 'not an array' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Messages array is required and must not be empty'
      });
    });

    it('should reject empty messages array', async () => {
      const response = await request(app)
        .post('/test')
        .send({ messages: [] })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Messages array is required and must not be empty'
      });
    });

    it('should reject messages without role', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { content: 'Hello' }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Each message must have role and content properties'
      });
    });

    it('should reject messages without content', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { role: 'user' }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Each message must have role and content properties'
      });
    });

    it('should reject invalid message roles', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { role: 'invalid', content: 'Hello' }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Message role must be system, user, or assistant'
      });
    });

    it('should accept all valid roles', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi!' }
          ]
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject non-string content', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { role: 'user', content: 123 }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Message content must be a string'
      });
    });
  });

  describe('temperature validation', () => {
    it('should accept valid temperature', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should accept temperature boundaries', async () => {
      await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0
        })
        .expect(200);

      await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 2
        })
        .expect(200);
    });

    it('should reject non-number temperature', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: '0.7'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Temperature must be a number between 0 and 2'
      });
    });

    it('should reject temperature below 0', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: -0.1
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Temperature must be a number between 0 and 2'
      });
    });

    it('should reject temperature above 2', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 2.1
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Temperature must be a number between 0 and 2'
      });
    });

    it('should allow undefined temperature', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('maxTokens validation', () => {
    it('should accept valid maxTokens', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 256
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should accept maxTokens boundaries', async () => {
      await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 1
        })
        .expect(200);

      await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 4096
        })
        .expect(200);
    });

    it('should reject non-number maxTokens', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: '256'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Max tokens must be a number between 1 and 4096'
      });
    });

    it('should reject maxTokens below 1', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 0
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Max tokens must be a number between 1 and 4096'
      });
    });

    it('should reject maxTokens above 4096', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 4097
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Max tokens must be a number between 1 and 4096'
      });
    });
  });

  describe('model validation', () => {
    it('should accept valid models', async () => {
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
        'codellama'
      ];

      for (const model of validModels) {
        const response = await request(app)
          .post('/test')
          .send({
            messages: [{ role: 'user', content: 'Hello' }],
            model
          })
          .expect(200);

        expect(response.body).toEqual({ success: true });
      }
    });

    it('should reject invalid model', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'invalid-model'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid model. Valid models are:');
    });

    it('should allow undefined model', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('complete request validation', () => {
    it('should accept complete valid request', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 256
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});

describe('validateBatchRequest', () => {
  let app;
  let mockHandler;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockHandler = jest.fn((req, res) => res.json({ success: true }));
    
    app.post('/batch', validateBatchRequest, mockHandler);
  });

  describe('requests validation', () => {
    it('should accept valid batch request', async () => {
      const response = await request(app)
        .post('/batch')
        .send({
          requests: [
            { messages: [{ role: 'user', content: 'Hello 1' }] },
            { messages: [{ role: 'user', content: 'Hello 2' }] }
          ]
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject missing requests', async () => {
      const response = await request(app)
        .post('/batch')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Requests must be an array'
      });
    });

    it('should reject non-array requests', async () => {
      const response = await request(app)
        .post('/batch')
        .send({ requests: 'not an array' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Requests must be an array'
      });
    });

    it('should reject empty requests array', async () => {
      const response = await request(app)
        .post('/batch')
        .send({ requests: [] })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Requests array must not be empty'
      });
    });

    it('should reject more than 10 requests', async () => {
      const requests = Array(11).fill({
        messages: [{ role: 'user', content: 'Hello' }]
      });

      const response = await request(app)
        .post('/batch')
        .send({ requests })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Maximum 10 requests allowed in a batch'
      });
    });

    it('should accept exactly 10 requests', async () => {
      const requests = Array(10).fill({
        messages: [{ role: 'user', content: 'Hello' }]
      });

      const response = await request(app)
        .post('/batch')
        .send({ requests })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('individual request validation', () => {
    it('should validate each request in batch', async () => {
      const response = await request(app)
        .post('/batch')
        .send({
          requests: [
            { messages: [{ role: 'user', content: 'Valid' }] },
            { messages: 'not an array' },
            { messages: [{ role: 'user', content: 'Valid' }] }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Request 1: Messages array is required'
      });
    });

    it('should validate message format in batch requests', async () => {
      const response = await request(app)
        .post('/batch')
        .send({
          requests: [
            { messages: [{ role: 'user', content: 'Valid' }] },
            { messages: [{ role: 'user' }] } // Missing content
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Request 1: Each message must have role and content'
      });
    });

    it('should accept batch with all valid requests', async () => {
      const response = await request(app)
        .post('/batch')
        .send({
          requests: [
            { 
              messages: [
                { role: 'system', content: 'Be helpful' },
                { role: 'user', content: 'Question 1' }
              ]
            },
            { 
              messages: [
                { role: 'user', content: 'Question 2' },
                { role: 'assistant', content: 'Answer 2' },
                { role: 'user', content: 'Follow-up' }
              ]
            },
            { 
              messages: [{ role: 'user', content: 'Question 3' }]
            }
          ]
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });
});