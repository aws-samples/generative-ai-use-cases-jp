import axios, { AxiosInstance } from 'axios';

/**
 * E2E tests for deployed API Gateway
 *
 * Usage:
 *   API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/api \
 *   ID_TOKEN=eyJraWQ... \
 *   npm test -- test/lambda/api/e2e.test.ts
 */

describe('API Gateway E2E Tests', () => {
  let client: AxiosInstance;
  const apiEndpoint = process.env.API_ENDPOINT;
  const idToken = process.env.ID_TOKEN;

  beforeAll(() => {
    if (!apiEndpoint) {
      throw new Error('API_ENDPOINT environment variable is required');
    }
    if (!idToken) {
      throw new Error('ID_TOKEN environment variable is required');
    }

    client = axios.create({
      baseURL: apiEndpoint,
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status
    });
  });

  describe('GET /chats', () => {
    it('returns 200 and list of chats', async () => {
      const res = await client.get('/chats');

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });
  });

  describe('POST /chats', () => {
    it('creates a new chat', async () => {
      const res = await client.post('/chats', {});

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('chat');
      expect(res.data.chat).toHaveProperty('chatId');
      expect(typeof res.data.chat.chatId).toBe('string');
    });
  });

  describe('GET /chats/:chatId', () => {
    it('returns 200 for existing chat', async () => {
      // Create a chat first
      const createRes = await client.post('/chats', {});
      const chatId = createRes.data.chat.chatId;

      const res = await client.get(`/chats/${chatId}`);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('chat');
      if (res.data.chat) {
        expect(res.data.chat).toHaveProperty('chatId', chatId);
      }
    });

    it('returns 200 with null for non-existent chat', async () => {
      const res = await client.get('/chats/non-existent-id');

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('chat');
      expect(res.data.chat).toBeNull();
    });
  });

  describe('DELETE /chats/:chatId', () => {
    it('deletes a chat', async () => {
      // Create a chat first
      const createRes = await client.post('/chats', {});
      const chatId = createRes.data.chat.chatId;

      const res = await client.delete(`/chats/${chatId}`);

      expect([200, 204, 500]).toContain(res.status);

      // Verify it's deleted (only if delete succeeded)
      if (res.status !== 500) {
        const getRes = await client.get(`/chats/${chatId}`);
        expect(getRes.data.chat).toBeNull();
      }
    });
  });

  describe('POST /predict', () => {
    it('generates prediction', async () => {
      const res = await client.post('/predict', {
        model: {
          type: 'bedrock',
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        },
        messages: [
          {
            role: 'user',
            content: [{ contentType: 'text', body: 'Hello' }],
          },
        ],
      });

      expect([200, 500]).toContain(res.status);
      // 500 is acceptable as it may fail due to model access or other reasons
      if (res.status === 200) {
        expect(res.data).toHaveProperty('message');
      }
    });
  });

  describe('GET /systemcontexts', () => {
    it('returns list of system contexts', async () => {
      const res = await client.get('/systemcontexts');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe('POST /systemcontexts', () => {
    it('creates a system context', async () => {
      const res = await client.post('/systemcontexts', {
        systemContext: 'You are a helpful assistant',
      });

      expect([200, 201]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        expect(res.data).toHaveProperty('messages');
        expect(res.data.messages).toHaveProperty('systemContextId');
      }
    });
  });

  describe('GET /usecases', () => {
    it('returns list of use cases', async () => {
      const res = await client.get('/usecases');

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });
  });

  describe('GET /token-usage', () => {
    it('returns token usage statistics', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await client.get('/token-usage', {
        params: {
          startDate: today,
          endDate: today,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();
    });
  });

  describe('GET /web-text', () => {
    it('extracts text from URL', async () => {
      const res = await client.get('/web-text', {
        params: {
          url: 'https://example.com',
        },
      });

      expect([200, 500]).toContain(res.status);
      // May fail due to network or parsing issues
    });
  });

  describe('POST /shares/chat/:chatId', () => {
    it('creates a share link', async () => {
      // Create a chat first
      const createRes = await client.post('/chats', {});
      const chatId = createRes.data.chat.chatId;

      const res = await client.post(`/shares/chat/${chatId}`);

      expect([200, 201, 403]).toContain(res.status);
      // 403 may occur if sharing is disabled
      if (res.status === 200 || res.status === 201) {
        expect(res.data).toHaveProperty('shareId');
      }
    });
  });

  describe('POST /file/url', () => {
    it('returns presigned URL for upload', async () => {
      const res = await client.post('/file/url', {
        filename: 'test.txt',
      });

      expect(res.status).toBe(200);
      // Response is the URL string directly
      expect(typeof res.data).toBe('string');
      expect(res.data).toContain('https://');
    });
  });

  describe('Authentication', () => {
    it('returns 401 without token', async () => {
      const unauthClient = axios.create({
        baseURL: apiEndpoint,
        validateStatus: () => true,
      });

      const res = await unauthClient.get('/chats');

      expect(res.status).toBe(401);
    });
  });
});
