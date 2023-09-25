import { UnrecordedMessage } from 'generative-ai-use-cases-jp';

const invoke = async (messages: UnrecordedMessage[]): Promise<string> => {
  console.log(messages);
  return 'Implementation for Bedrock is coming soon.';
};

async function* invokeStream(
  messages: UnrecordedMessage[]
): AsyncIterable<string> {
  console.log(messages);
  yield 'Implementation for Bedrock is coming soon.';
}

export default {
  invoke,
  invokeStream,
};
