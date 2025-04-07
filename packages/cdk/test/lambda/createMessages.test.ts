import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../lambda/createMessages';
import { batchCreateMessages, findChatById } from '../../lambda/repository';
import { RecordedMessage, ToBeRecordedMessage } from 'generative-ai-use-cases';

// Mock the repository
jest.mock('../../lambda/repository');
const mockedBatchCreateMessages = batchCreateMessages as jest.MockedFunction<
  typeof batchCreateMessages
>;
const mockedFindChatById = findChatById as jest.MockedFunction<
  typeof findChatById
>;

// Helper function to create APIGatewayProxyEvent
function createAPIGatewayProxyEvent(
  body: unknown | null,
  chatId?: string,
  userId?: string
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    pathParameters: chatId ? { chatId } : {},
    requestContext: {
      authorizer: userId
        ? {
            claims: {
              'cognito:username': userId,
            },
          }
        : undefined,
    },
  } as APIGatewayProxyEvent;
}

describe('createMessages Lambda handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Test for successful request
  test('returns correct response for valid request', async () => {
    // Test data
    const messages: ToBeRecordedMessage[] = [
      {
        messageId: 'msg123',
        role: 'user',
        content: 'Hello, world!',
        usecase: 'test',
      },
    ];

    const userId = 'testUser';
    const chatId = 'chat123';

    const expectedRecordedMessages: RecordedMessage[] = [
      {
        id: `chat#${chatId}`,
        createdDate: '1234567890',
        messageId: 'msg123',
        role: 'user',
        content: 'Hello, world!',
        userId: `user#${userId}`,
        feedback: 'none',
        usecase: 'test',
      },
    ];

    // Set up mocks
    mockedFindChatById.mockResolvedValue({
      id: `user#${userId}`,
      createdDate: '1234567890',
      chatId: `chat#${chatId}`,
      usecase: '',
      title: '',
      updatedDate: '',
    });
    mockedBatchCreateMessages.mockResolvedValue(expectedRecordedMessages);

    // Execute test
    const result = await handler(
      createAPIGatewayProxyEvent({ messages }, chatId, userId)
    );

    // Verify results
    expect(result.statusCode).toBe(200);
    expect(mockedFindChatById).toHaveBeenCalledWith(userId, chatId);
    expect(mockedBatchCreateMessages).toHaveBeenCalledWith(
      messages,
      userId,
      chatId
    );
    expect(JSON.parse(result.body)).toEqual({
      messages: expectedRecordedMessages,
    });
  });

  // Test for unauthorized access
  test('returns 403 error when user does not have access to chat', async () => {
    const messages: ToBeRecordedMessage[] = [
      {
        messageId: 'msg123',
        role: 'user',
        content: 'Hello, world!',
        usecase: 'test',
      },
    ];
    const userId = 'testUser';
    const chatId = 'chat123';

    // Set up mock - chat not found
    mockedFindChatById.mockResolvedValue(null);

    // Execute test
    const result = await handler(
      createAPIGatewayProxyEvent({ messages }, chatId, userId)
    );

    // Verify results
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      message: 'You do not have permission to post messages in the chat.',
    });
    expect(mockedBatchCreateMessages).not.toHaveBeenCalled();
  });

  // Test for invalid extraData
  test('returns 400 error when extraData is invalid | javascript:alert(1)', async () => {
    const messages: ToBeRecordedMessage[] = [
      {
        messageId: 'msg123',
        role: 'user',
        content: 'Hello, world!',
        usecase: 'test',
        extraData: [
          {
            type: 'image',
            name: 'test.png',
            source: {
              type: 'base64',
              mediaType: 'image/png',
              data: 'javascript:alert(1)',
            },
          },
        ],
      },
    ];
    const userId = 'testUser';
    const chatId = 'chat123';

    // Set up mock
    mockedFindChatById.mockResolvedValue({
      id: `user#${userId}`,
      createdDate: '1234567890',
      chatId: `chat#${chatId}`,
      usecase: '',
      title: '',
      updatedDate: '',
    });

    // Execute test
    const result = await handler(
      createAPIGatewayProxyEvent({ messages }, chatId, userId)
    );

    // Verify results
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Invalid extraData',
    });
    expect(mockedBatchCreateMessages).not.toHaveBeenCalled();
  });

  // Test for extraData sanitization
  test('sanitizes extraData correctly | <script>alert("XSS")</script><p>Valid content</p>', async () => {
    // Test data with HTML in extraData
    const messages: ToBeRecordedMessage[] = [
      {
        messageId: 'msg123',
        role: 'user',
        content: 'Hello, world!',
        usecase: 'test',
        extraData: [
          {
            type: 'json',
            name: 'test.json',
            source: {
              type: 'json',
              mediaType: 'application/json',
              data: '<script>alert("XSS")</script><p>Valid content</p>',
            },
          },
        ],
      },
    ];

    const userId = 'testUser';
    const chatId = 'chat123';

    const expectedRecordedMessages: RecordedMessage[] = [
      {
        id: `chat#${chatId}`,
        createdDate: expect.any(String),
        messageId: 'msg123',
        role: 'user',
        content: 'Hello, world!',
        userId: `user#${userId}`,
        feedback: 'none',
        usecase: 'test',
        extraData: messages[0].extraData,
      },
    ];

    // Set up mocks
    mockedFindChatById.mockResolvedValue({
      id: `user#${userId}`,
      createdDate: '1234567890',
      chatId: `chat#${chatId}`,
      usecase: '',
      title: '',
      updatedDate: '',
    });
    mockedBatchCreateMessages.mockResolvedValue(expectedRecordedMessages);

    // Execute test - Expected: script tags are sanitized but p tags are allowed
    await handler(createAPIGatewayProxyEvent({ messages }, chatId, userId));

    // Verify that extraData is sanitized when calling batchCreateMessages
    const sanitizedMessages = mockedBatchCreateMessages.mock.calls[0][0];
    expect(sanitizedMessages[0].extraData?.[0].source.data).not.toContain(
      '<script>'
    );
    expect(sanitizedMessages[0].extraData?.[0].source.data).toContain(
      '<p>Valid content</p>'
    );
  });
});
