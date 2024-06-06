export type TestCaseType = {
  describe?: string;
  input: string | object;
  output: string | object;
};

export type TestResultType = {
  status: 'pass' | 'fail' | 'testing';
  result: string | object;
};
