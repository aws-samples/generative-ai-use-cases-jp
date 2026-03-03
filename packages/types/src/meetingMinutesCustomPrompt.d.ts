import { PrimaryKey } from './base';

export type MeetingMinutesCustomPrompt = PrimaryKey & {
  meetingMinutesCustomPromptId: string;
  meetingMinutesCustomPromptTitle: string;
  meetingMinutesCustomPromptBody: string;
};
