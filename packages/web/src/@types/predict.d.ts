export type Role = 'system' | 'user' | 'assistant';
export type PredictContent = {
  role: Role;
  content: string;
};
