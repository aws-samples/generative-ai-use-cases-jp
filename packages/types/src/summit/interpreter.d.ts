export type CreateLambdaFunctionRequest = {
  functionName: string;
  runtime: string;
  role: string;
  code: string;
};

export type UpdateLambdaFunctionRequest = {
  functionName: string;
  runtime: string;
  role: string;
  code: string;
};

export type InvokeLambdaFunctionRequest = {
  functionName: string;
  payload: string | object;
};
