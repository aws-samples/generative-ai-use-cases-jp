import { PrimaryKey } from './base';

export type SystemContext = PrimaryKey & {
  systemContextId: string;
  systemContext: string;
  systemContextTitle: string;
};

export type SystemContextListItem = {
  title: string;
  systemContext: string;
  systemContextId: string;
  prompt?: string;
  className?: string;
};
