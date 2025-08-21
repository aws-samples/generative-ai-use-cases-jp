# Repository Pattern Usage Guide

## Overview

The TenantRepository pattern provides a cleaner API for Lambda handlers that automatically handles:

- Multi-tenant DynamoDB operations
- Error handling and consistent error responses
- User ID extraction from events
- Tenant ID extraction for data isolation

## Architecture

### Key Components

1. **TenantRepository Class**: Encapsulates the event context and provides clean method signatures
2. **IRepository Interface**: Type-safe interface defining all repository operations
3. **Higher-Order Functions**: `withRepository` and `withTenantRepository` for automatic error handling
4. **Factory Function**: `createTenantRepository` for manual repository creation

## Usage Patterns

### 1. Simplest Pattern - Using `withRepository`

**Recommended for new code**

```typescript
import { withRepository } from './tenantRepository';

export const handler = withRepository(async (repo) => {
  const chat = await repo.createChat(repo.userId);
  const messages = await repo.listMessages(chat.id);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ chat, messages }),
  };
});
```

**Benefits:**

- No need to extract userId manually
- Automatic error handling
- Clean, minimal code

### 2. Using `withTenantRepository`

**When you need userId and event parameters separately**

```typescript
import { withTenantRepository } from './tenantRepository';

export const handler = withTenantRepository(async (repo, userId, event) => {
  const chatId = event.pathParameters!.chatId!;

  // Authorization check
  const chat = await repo.findChatById(userId, chatId);
  if (!chat) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  const messages = await repo.listMessages(chatId);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ messages }),
  };
});
```

**Benefits:**

- Direct access to userId without repo.userId
- Access to full event object for path parameters, query strings, etc.
- Still includes automatic error handling

### 3. Manual Repository Creation

**For complex scenarios requiring custom error handling**

```typescript
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createTenantRepository } from './tenantRepository';

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const repo = createTenantRepository(event);
    const userId = repo.userId;

    // Complex business logic here
    const chat = await repo.createChat(userId);

    // Custom processing
    if (someCondition) {
      // Special handling
    }

    const messages = await repo.listMessages(chat.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ chat, messages }),
    };
  } catch (error) {
    // Custom error handling
    console.error('Custom error handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Custom error message',
        details: error instanceof Error ? error.message : 'Unknown',
      }),
    };
  }
};
```

### 4. Gradual Migration Pattern

**For migrating existing code incrementally**

```typescript
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createTenantRepository } from './tenantRepository';
import { createChat as oldCreateChat } from './repository'; // Old import

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = event.requestContext.authorizer!.claims['cognito:username'];

  // Old code - still works during migration
  const oldChat = await oldCreateChat(userId, event);

  // New code - cleaner approach
  const repo = createTenantRepository(event);
  const newChat = await repo.createChat(userId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ oldChat, newChat }),
  };
};
```

## Available Repository Methods

### Chat Operations

- `createChat(userId: string): Promise<Chat>`
- `findChatById(userId: string, chatId: string): Promise<Chat | null>`
- `listChats(userId: string, exclusiveStartKey?: string): Promise<ListChatsResponse>`
- `setChatTitle(id: string, createdDate: string, title: string): Promise<Chat>`
- `deleteChat(userId: string, chatId: string): Promise<void>`

### System Context Operations

- `findSystemContextById(userId: string, systemContextId: string): Promise<SystemContext | null>`
- `listSystemContexts(userId: string): Promise<SystemContext[]>`
- `createSystemContext(userId: string, title: string, systemContext: string): Promise<SystemContext>`
- `updateSystemContextTitle(userId: string, systemContextId: string, title: string): Promise<SystemContext>`
- `deleteSystemContext(userId: string, systemContextId: string): Promise<void>`

### Message Operations

- `listMessages(chatId: string): Promise<RecordedMessage[]>`
- `batchCreateMessages(messages: ToBeRecordedMessage[], userId: string, chatId: string): Promise<RecordedMessage[]>`
- `updateFeedback(chatId: string, feedbackData: UpdateFeedbackRequest): Promise<RecordedMessage>`

### Share Operations

- `createShareId(userId: string, chatId: string): Promise<{ shareId: ShareId; userIdAndChatId: UserIdAndChatId }>`
- `findUserIdAndChatId(shareId: string): Promise<UserIdAndChatId | null>`
- `findShareId(userId: string, chatId: string): Promise<ShareId | null>`
- `deleteShareId(shareId: string): Promise<void>`

### Token Usage Operations

- `aggregateTokenUsage(startDate: string, endDate: string, userIds?: string[]): Promise<TokenUsageStats[]>`

## Benefits of the Repository Pattern

1. **Code Reduction**: ~66% less boilerplate code in handlers
2. **Consistent Error Handling**: Automatic error responses with proper status codes
3. **Type Safety**: Full TypeScript support with interfaces
4. **Multi-tenant Support**: Automatic tenant isolation for DynamoDB operations
5. **Clean API**: No need to pass event objects through every function call
6. **Easy Testing**: Repository can be easily mocked for unit tests
7. **Backward Compatible**: Can be adopted gradually alongside existing code

## Migration Guide

### Step 1: Identify Handlers to Migrate

Look for Lambda handlers that:

- Import directly from `./repository`
- Have try-catch blocks with similar error handling
- Extract userId from event.requestContext.authorizer

### Step 2: Choose the Right Pattern

- Use `withRepository` for simple operations
- Use `withTenantRepository` when you need event parameters
- Use manual creation for complex custom logic

### Step 3: Update Imports

```typescript
// Old
import { createChat, listMessages } from './repository';

// New
import { withRepository } from './tenantRepository';
```

### Step 4: Refactor Handler

```typescript
// Old pattern
export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer!.claims['cognito:username'];
    const chat = await createChat(userId, event);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ chat }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

// New pattern
export const handler = withRepository(async (repo) => {
  const chat = await repo.createChat(repo.userId);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ chat }),
  };
});
```

### Step 5: Test

Ensure all handlers work correctly after migration by:

1. Running TypeScript compilation: `npm run lambda-build-dryrun`
2. Testing Lambda functions locally or in development environment
3. Verifying multi-tenant isolation is maintained

## Security Considerations

The repository pattern maintains security through:

- Automatic tenant ID extraction from JWT tokens
- Table name construction with tenant suffix: `<BaseTable>-tenant-<TenantID>`
- IAM policies using session tags for access control
- User ID validation from Cognito claims

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure you're using the correct wrapper function signature
2. **Missing User ID**: Check that the authorizer is properly configured
3. **Tenant Isolation**: Verify custom:tenant_id claim is present in JWT tokens
4. **Access Denied**: Check IAM policies allow access to tenant-specific tables
