import {
  GenerateImageParams,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';

export type InvokeInterface = (
  messages: UnrecordedMessage[]
) => Promise<string>;

export type InvokeStreamInterface = (
  messages: UnrecordedMessage[]
) => AsyncIterable<string>;

// Base64 にエンコードした画像を Return する
export type GenerateImageInterface = (
  params: GenerateImageParams
) => Promise<string>;

export type ApiInterface = {
  invoke: InvokeInterface;
  invokeStream: InvokeStreamInterface;
  generateImage: GenerateImageInterface;
};
