export type TitanParams = {
  inputText?: string;
  textGenerationConfig?: {
    temperature?: number;
    topP?: number;
    maxTokenCount?: number;
    stopSequences?: string[];
  };
};

// Claude v2 & Claude Instant v1
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html
export type ClaudeParams = {
  prompt?: string;
  max_tokens_to_sample?: number;
  stop_sequences?: string[];
  temperature?: number;
  top_k?: number;
  top_p?: number;
};

// Text Generation Inference
// https://github.com/huggingface/text-generation-inference
export type TGIParams = {
  inputs: string;
  parameters: {
    max_new_tokens: number;
    return_full_text: boolean;
    do_sample: boolean;
    temperature: number;
  };
};
