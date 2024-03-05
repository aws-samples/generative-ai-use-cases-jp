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

// Claude Message
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
export type ClaudeMessageParams = {
  system?: string;
  anthropic_version?: string;
  messages?: {
    role: string;
    content: {
      type: string;
      text?: string;
      source?: {
        type: string;
        media_type: string;
        data: string;
      };
    }[];
  }[];
  max_tokens?: number;
  stop_sequences?: string[];
  temperature?: number;
  top_k?: number;
  top_p?: number;
};

// Llama2
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-meta.html
export type Llama2Params = {
  prompt?: string;
  max_gen_len?: number;
  temperature?: number;
  top_p?: number;
};

// Mistral
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-mistral.html
export type MistralParams = {
  prompt?: string;
  max_tokens?: number;
  stop?: string[];
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

export type BedrockResponse = {
  // Claude
  completion: string;
  type: string;
  // ClaudeMessage Non-stream
  content: {
    type: string;
    text: string;
  }[];
  // ClaudeMessage Stream
  delta: {
    text: string;
  };
  // Titan
  outputText: string;
  // Llama2
  generation: string;
  // Mistral
  outputs: {
    text: string;
  }[];
};
