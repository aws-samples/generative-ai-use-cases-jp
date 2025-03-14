import {
  GenerateImageParams,
  GenerateVideoParams,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';

export type InvokeInterface = (
  model: Model,
  messages: UnrecordedMessage[],
  id: string
) => Promise<string>;

export type InvokeStreamInterface = (
  model: Model,
  messages: UnrecordedMessage[],
  id: string,
  idToken?: string
) => AsyncIterable<string>;

// Base64 にエンコードした画像を Return する
export type GenerateImageInterface = (
  model: Model,
  params: GenerateImageParams
) => Promise<string>;

export type GenerateVideoInterface = (
  model: Model,
  params: GenerateVideoParams
) => Promise<string>;

export type ApiInterface = {
  invoke: InvokeInterface;
  invokeStream: InvokeStreamInterface;
  generateImage: GenerateImageInterface;
  generateVideo: GenerateVideoInterface;
};
