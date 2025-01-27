export type ExplicitFilterConfiguration = {
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'STRING_LIST';
  defaultValue?: string | number | boolean | string[];
  // STRING or STRINGLIST
  options?: { value: string; label: string }[];
  // NUMBER
  range?: {
    min?: number;
    max?: number;
  };
  description: string;
};
