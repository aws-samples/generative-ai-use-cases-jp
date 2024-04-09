import { SystemContext } from './chat';

export type MessagePayload =
  | {
      type: 'CHAT-OPEN';
    }
  | {
      type: 'CONTENT';
      content: string;
    }
  | {
      type: 'SYSTEM-CONTEXT';
      systemContext: SystemContext;
    };
