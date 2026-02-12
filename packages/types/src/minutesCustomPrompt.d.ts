import { PrimaryKey } from './base';

export type MinutesCustomPrompt = PrimaryKey & {
  minutesCustomPromptId: string;
  minutesCustomPromptTitle: string;
  minutesCustomPromptBody: string;
};
