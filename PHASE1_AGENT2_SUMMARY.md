# Phase 1 - Agent 2: Frontend API Hook Implementation

## Completed Tasks

### 1. Created useAssistantApi Hook
**File:** `/home/lith/wkspace/generative-ai-use-cases/feature-assistant-reimpl/packages/web/src/hooks/useAssistantApi.ts`

Implemented a React hook with all 8 required methods:

1. `listAssistants(params?: ListAssistantsQueryParams): Promise<ListAssistantsResponse>`
2. `getAssistant(assistantId: string): Promise<Assistant>`
3. `createAssistant(request: CreateAssistantRequest): Promise<Assistant>`
4. `updateAssistant(assistantId: string, request: UpdateAssistantRequest): Promise<Assistant>`
5. `deleteAssistant(assistantId: string): Promise<void>`
6. `listMessages(assistantId: string, params?: ListAssistantMessagesQueryParams): Promise<ListAssistantMessagesResponse>`
7. `createMessage(assistantId: string, request: CreateAssistantMessageRequest): Promise<AssistantMessage>`
8. `requestUploadUrl(request: RequestUploadUrlRequest): Promise<RequestUploadUrlResponse>`

**Implementation Details:**
- Uses the existing `useHttp` hook for HTTP requests
- Base URL: `/api/assistant`
- All methods properly typed using types from `generative-ai-use-cases` package
- Query parameters properly constructed for list operations
- Follows existing codebase patterns (similar to `useChatApi` and `useRagApi`)

### 2. Deleted Legacy Hook
**File:** `packages/web/src/hooks/useBedrockChatApi.ts` (DELETED)

The legacy bedrock-chat API hook has been removed as it's being replaced by the new assistant API.

### 3. Type Safety Verification
- All imports from `generative-ai-use-cases` package resolve correctly
- TypeScript compilation succeeds for the new hook
- No circular dependencies introduced

## Files That Import useBedrockChatApi (Phase 3 Work)

The following files currently import the deleted hook and will need to be updated in Phase 3:

1. `packages/web/src/components/ChatSidebar.tsx`
2. `packages/web/src/pages/AssistantCreatePage.tsx`
3. `packages/web/src/pages/AssistantsPage.tsx`
4. `packages/web/src/pages/RagChatBotChatPage.tsx`
5. `packages/web/src/pages/RagChatBotEditPage.tsx`
6. `packages/web/src/pages/RagChatBotHistoryPage.tsx`
7. `packages/web/src/pages/RagChatBotPage.tsx`

These files are currently failing TypeScript compilation with:
```
error TS2307: Cannot find module '../hooks/useBedrockChatApi' or its corresponding type declarations.
```

This is expected and will be resolved in Phase 3 when these components are updated to use the new assistant API.

## API Endpoints Mapping

| Method | HTTP Method | Endpoint |
|--------|-------------|----------|
| `listAssistants` | GET | `/api/assistant?limit={}&nextToken={}` |
| `getAssistant` | GET | `/api/assistant/{id}` |
| `createAssistant` | POST | `/api/assistant` |
| `updateAssistant` | PUT | `/api/assistant/{id}` |
| `deleteAssistant` | DELETE | `/api/assistant/{id}` |
| `listMessages` | GET | `/api/assistant/{id}/messages?limit={}&nextToken={}` |
| `createMessage` | POST | `/api/assistant/{id}/messages` |
| `requestUploadUrl` | POST | `/api/assistant/upload-url` |

## Success Criteria - All Met

- ✅ `useAssistantApi` hook created with all 8 methods
- ✅ All methods properly typed using types from `packages/types`
- ✅ Legacy `useBedrockChatApi` deleted
- ✅ TypeScript compilation succeeds for the hook itself
- ✅ Hook follows existing patterns in the codebase
- ✅ Uses `useHttp` for HTTP client consistency
- ✅ Proper error handling (via http.post/put/delete/get methods)
- ✅ No circular dependencies

## Next Steps (Phase 3)

Phase 3 will update the 7 files listed above to use the new `useAssistantApi` hook instead of the deleted `useBedrockChatApi` hook.
