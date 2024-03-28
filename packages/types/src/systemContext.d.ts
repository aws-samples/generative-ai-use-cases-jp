import { PrimaryKey } from './base';

export type SystemContext = PrimaryKey & {
  systemContextId: string;
  systemContext: string;
  systemContextTitle: string;
};
