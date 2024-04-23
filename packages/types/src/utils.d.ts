import {
  GenerateImageParams,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';

export type InvokeInterface = (
  model: Model,
  messages: UnrecordedMessage[],
  usecase?: string
) => Promise<string>;

export type InvokeStreamInterface = (
  model: Model,
  messages: UnrecordedMessage[],
  usecase?: string
) => AsyncIterable<string>;

// Base64 にエンコードした画像を Return する
export type GenerateImageInterface = (
  model: Model,
  params: GenerateImageParams
) => Promise<string>;

export type ApiInterface = {
  invoke: InvokeInterface;
  invokeStream: InvokeStreamInterface;
  generateImage: GenerateImageInterface;
};
