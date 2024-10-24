# Deployment Options

## How to Configure

GenU changes settings via the context in AWS CDK.

**While you can also specify the context with '-c', it is recommended to change the settings in cdk.json for this asset, as doing so will not modify the codebase or trigger a frontend build.**

### How to Change Values in cdk.json

Change the values under the context in [packages/cdk/cdk.json](/packages/cdk/cdk.json). For example, setting `"ragEnabled": true` will enable the RAG chat use case. After setting the context values, redeploy with the following command to apply the changes:

```bash
npm run cdk:deploy
```

## Use Case Configuration

### Enabling the RAG Chat (Amazon Kendra) Use Case

Set `ragEnabled` to `true` in the context (default is `false`).

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "ragEnabled": true
  }
}
```

After making the change, redeploy with `npm run cdk:deploy` to apply it. The data stored in `/packages/cdk/rag-docs/docs` will be automatically uploaded to the S3 bucket for the Kendra data source.

Next, sync the Kendra Data source by following these steps:

1. Open the [Amazon Kendra console](https://console.aws.amazon.com/kendra/home)
2. Click on generative-ai-use-cases-index
3. Click on Data sources
4. Click on "s3-data-source"
5. Click Sync now

If the Status / Summary in the Sync run history shows Completed, the process is finished. The files stored in S3 have been synchronized and can now be searched using Kendra.

#### Using an Existing Amazon Kendra Index

If you want to use an existing Kendra Index, note that `ragEnabled` still needs to be set to `true`.

Specify the Index ARN in the `kendraIndexArn` context. If you are using an S3 data source with the existing Kendra Index, also specify the bucket name in `kendraDataSourceBucketName`.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "kendraIndexArn": "<Kendra Index ARN>",
    "kendraDataSourceBucketName": "<Kendra S3 Data Source Bucket Name>"
  }
}
```

After making the changes, redeploy with `npm run cdk:deploy` to apply them.

The `<Kendra Index ARN>` should be in the following format:

```
arn:aws:kendra:<Region>:<AWS Account ID>:index/<Index ID>
```

For example:

```
arn:aws:kendra:ap-northeast-1:333333333333:index/77777777-3333-4444-aaaa-111111111111
```

### Enabling the RAG Chat (Knowledge Base) Use Case

Set `ragKnowledgeBaseEnabled` to `true` in the context (default is `false`).

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "ragKnowledgeBaseEnabled": true,
    "ragKnowledgeBaseStandbyReplicas": false,
    "ragKnowledgeBaseAdvancedParsing": false,
    "ragKnowledgeBaseAdvancedParsingModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "embeddingModelId": "amazon.titan-embed-text-v2:0",
  }
}
```

`ragKnowledgeBaseStandbyReplicas` is a value related to the redundancy of the automatically created OpenSearch Serverless.
- `false`: Suitable for development and testing purposes. It operates in a single AZ and halves the OCU cost.
- `true`: Suitable for production environments. It operates across multiple AZs, providing high availability.

`embeddingModelId` is the model used for embedding. Currently, the following models are supported:

```
"amazon.titan-embed-text-v1"
"amazon.titan-embed-text-v2:0"
"cohere.embed-multilingual-v3"
"cohere.embed-english-v3"
```

After making the changes, redeploy with `npm run cdk:deploy` to apply them. The Knowledge Base will be deployed in the region specified by `modelRegion` in `cdk.json`. Please note the following:

- The `embeddingModelId` model must be enabled in Bedrock in the `modelRegion` region.
- AWS CDK Bootstrap must be completed in the `modelRegion` region before running `npm run cdk:deploy`.

```bash
# Example command to Bootstrap (assuming modelRegion is us-east-1)
npx -w packages/cdk cdk bootstrap --region us-east-1
```

During deployment, the data stored in `/packages/cdk/rag-docs/docs` will be automatically uploaded to the S3 bucket for the Knowledge Base data source. After deployment, sync the Knowledge Base Data source by following these steps:

1. Open the [Knowledge Base console](https://console.aws.amazon.com/bedrock/home#/knowledge-bases)
2. Click on generative-ai-use-cases-jp
3. Select s3-data-source, then click Sync

Once the Status becomes Available, the process is complete. The files stored in S3 have been ingested, and you can now search the Knowledge Base.

> [!NOTE]
> If you want to disable the RAG Chat (Knowledge Base) setting after enabling it, setting `ragKnowledgeBaseEnabled: false` and redeploying will disable the RAG Chat (Knowledge Base), but the `RagKnowledgeBaseStack` itself will remain. Open the management console, navigate to CloudFormation in the modelRegion, and delete the `RagKnowledgeBaseStack` to completely remove it.

#### Enabling Advanced Parsing

You can enable the [Advanced Parsing feature](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html#kb-advanced-parsing). Advanced Parsing analyzes and extracts information from unstructured data such as tables and graphs within files. By adding the extracted data from tables and graphs to the text content, you can potentially improve the accuracy of RAG.

- `ragKnowledgeBaseAdvancedParsing`: Set to `true` to enable Advanced Parsing
- `ragKnowledgeBaseAdvancedParsingModelId`: Specify the model ID to be used for extracting information
  - Supported models (as of 2024/08)
    - `anthropic.claude-3-sonnet-20240229-v1:0`
    - `anthropic.claude-3-haiku-20240307-v1:0`

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "ragKnowledgeBaseEnabled": true,
    "ragKnowledgeBaseStandbyReplicas": false,
    "ragKnowledgeBaseAdvancedParsing": true,
    "ragKnowledgeBaseAdvancedParsingModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "embeddingModelId": "amazon.titan-embed-text-v2:0",
  }
}
```

#### Changing the Chunking Strategy

In [rag-knowledge-base-stack.ts](/packages/cdk/lib/rag-knowledge-base-stack.ts), there is a section where you can specify the `chunkingConfiguration`. By uncommenting it, you can change the chunking strategy based on the [CDK documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnDataSource.ChunkingConfigurationProperty.html) and the [CloudFormation documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html).

For example, to change to semantic chunking, uncomment the code and specify as follows:

```typescript
// Semantic chunking
chunkingConfiguration: {
  chunkingStrategy: 'SEMANTIC',
  semanticChunkingConfiguration: {
    maxTokens: 300,
    bufferSize: 0,
    breakpointPercentileThreshold: 95,
  },
},
```

After that, refer to the [Recreating the Knowledge Base or OpenSearch Service to Apply Changes](#recreating-the-knowledge-base-or-opensearch-service-to-apply-changes) section to apply the changes.

#### Recreating the Knowledge Base or OpenSearch Service to Apply Changes

If you make changes to the following `cdk.json` parameters related to the [chunking strategy](./DEPLOY_OPTION.md#changing-the-chunking-strategy) or OpenSearch Service, running `npm run cdk:deploy` will not apply the changes:

- `embeddingModelId`
- `ragKnowledgeBaseStandbyReplicas`
- `ragKnowledgeBaseAdvancedParsing`
- `ragKnowledgeBaseAdvancedParsingModelId`

To apply the changes, follow these steps to delete and recreate the existing Knowledge Base-related resources:

1. Set `ragKnowledgeBaseEnabled` to `false` in `cdk.json` and deploy
2. Open [CloudFormation](https://console.aws.amazon.com/cloudformation/home) (pay attention to the region), click on the RagKnowledgeBaseStack
3. Click Delete in the top-right corner to delete the RagKnowledgeBaseStack
   **This will delete the S3 bucket and RAG files, temporarily disabling the RAG chat**
4. Make the necessary changes to `cdk.json` or the chunking strategy
5. After the RagKnowledgeBaseStack deletion is complete, redeploy with `npm run cdk:deploy`

Deleting the RagKnowledgeBaseStack will also **delete the S3 bucket and RAG files used for the RAG chat**.
If you had uploaded RAG files to the S3 bucket, make sure to back them up and upload them again after the deployment.
Also, follow the steps mentioned earlier to sync the Data source.

#### Viewing the OpenSearch Service Index in the Management Console

By default, when you try to open the Indexes tab in the OpenSearch Service management console, you will encounter the error "User does not have permissions for the requested resource". This is because the Data access policy does not grant permissions to the IAM user you are logged in with.

To grant the necessary permissions, follow these steps:

1. Open [OpenSearch Service](https://console.aws.amazon.com/aos/home?#opensearch/collections) (pay attention to the region) and click on generative-ai-use-cases-jp
2. Click on the Associated policy under Data access, which should be named generative-ai-use-cases-jp
3. Click Edit in the top-right corner
4. In the middle of the page, click Add principals under Select principals and add the IAM User/Role (the permissions you are logged in with)
5. Save

After saving, wait a moment and try accessing the console again.

### Enabling the Agent Chat Use Case

The Agent Chat use case allows you to:
- Visualize data, execute code, and analyze data using the Code Interpreter
- Execute actions using Agents for Amazon Bedrock
- Reference the vector database of Knowledge Bases for Amazon Bedrock

#### Deploying the Code Interpreter Agent

The Code Interpreter allows you to visualize data, execute code, and analyze data.
For detailed steps, please refer to [this guide](AGENTS_CODE_INTERPRETER.md). This section provides an overview of the process.

Create an Agent with the Code Interpreter functionality enabled in the AWS Management Console.

Create an Alias for the Agent, copy the `agentId` and `aliasId`, and add them to `cdk.json` in the following format. Set the `displayName` to the name you want to display in the GenU UI. Also, set `agentEnabled` to `true` in the context and specify the region where you created the Agent in `agentRegion`. Then, redeploy with `npm run cdk:deploy` to apply the changes.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
    "agents": [
      {
        "displayName": "Code Interpreter",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

#### Deploying the Search Agent

You can create an Agent that integrates with APIs to reference the latest information and provide answers. You can customize the Agent and add additional actions, or create multiple Agents and switch between them.

The default search agent uses the [Brave Search API's Data for AI](https://brave.com/search/api/) due to the limitations of the free tier's size, request limits, and cost considerations. However, you can customize it to use other APIs. Obtaining an API key may require registering a credit card, even for the free plan.

> [!NOTE]
> Enabling the Agent Chat use case will only send data to external APIs (by default, the Brave Search API) from the Agent Chat use case. Other use cases will continue to operate within AWS. Please check your internal policies and API terms of use before enabling this feature.

Set `agentEnabled` and `searchAgentEnabled` to `true` in the context (default is `false`). Specify the region where Agents for Bedrock is available in `agentRegion` ([refer to the documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-supported.html)), and provide the search engine's API key in `searchApiKey`.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
    "searchAgentEnabled": true,
    "searchApiKey": "<Search Engine API Key>",
  }
}
```

After making the changes, redeploy with `npm run cdk:deploy` to apply them. This will deploy the default search engine Agent.

If you want to register an Agent that you created manually, in addition to the default Agent, add it to the `agents` array as follows:

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "agents": [
      {
        "displayName": "SearchEngine",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

You can also modify `packages/cdk/lib/construct/agent.ts` to define a new Agent.

> [!NOTE]
> If you want to disable the search agent setting after enabling it, setting `searchAgentEnabled: false` and redeploying will disable the search agent, but the `WebSearchAgentStack` itself will remain. Open the management console, navigate to CloudFormation in the agentRegion, and delete the `WebSearchAgentStack` to completely remove it.

#### Deploying Agents for Amazon Bedrock Knowledge Bases

You can also manually create and register agents that integrate with Amazon Bedrock Knowledge Bases.

First, create a knowledge base by referring to the [Amazon Bedrock Knowledge Bases documentation](https://docs.aws.amazon.com/en_us/bedrock/latest/userguide/knowledge-base-create.html) from the [AWS Console for Knowledge Bases](https://console.aws.amazon.com/bedrock/home?#/knowledge-bases). Create the knowledge base in the same region as the `agentRegion` mentioned later.

Next, manually create an Agent from the [AWS Console for Agents](https://console.aws.amazon.com/bedrock/home?#/agents). Keep the settings mostly default, and refer to the following example for the Agent prompt. The `anthropic.claude-instant-v1` model is recommended for faster responses. You don't need to set up an action group, so proceed without it. Register the knowledge base you created in the previous step, and refer to the following example for the prompt.

```
Agent Prompt Example: You are an assistant that responds to instructions. Search for information based on the instructions and provide appropriate answers based on the content. Do not answer anything not mentioned in the information.
Knowledge Base Prompt Example: Search for information using keywords. You can use this for tasks like investigating, researching, explaining about X, or summarizing. Infer the search keywords from the conversation. The search results may include irrelevant content, so refer only to the most relevant information when answering. You can run this multiple times.
```

Create an Alias from the created Agent, copy the `agentId` and `aliasId`, and add the context in the following format. Set `displayName` to the name you want to display in the UI. Also, set the `agentEnabled` context to True, and specify the region where you created the Agent for `agentRegion`. Redeploy using `npm run cdk:deploy` to apply the changes.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
    "agents": [
      {
        "displayName": "Knowledge Base",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

### Enabling the PromptFlow Chat Use Case

With the PromptFlow chat use case, you can invoke pre-created Prompt Flows.

Open the `cdk.json` file in the project root directory and add or edit the `promptFlows` array in the `context` section.

Manually create Prompt Flows from the [Prompt Flows AWS console](https://console.aws.amazon.com/bedrock/home#/prompt-flows). Then, create an Alias and add the `flowId`, `aliasId`, and `flowName` of the created Prompt Flow. Specify a descriptive sentence in `description` to prompt the user's input. This description will be displayed in the text box of the Prompt Flow chat.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```json
{
  "context": {
    "promptFlows": [
      {
        "flowId": "XXXXXXXXXX",
        "aliasId": "YYYYYYYYYY",
        "flowName": "WhatIsItFlow",
        "description": "This flow searches the web for any keyword and returns an explanation. Please enter a keyword."
      },
      {
        "flowId": "ZZZZZZZZZZ",
        "aliasId": "OOOOOOOOOO",
        "flowName": "RecipeFlow",
        "description": "This flow creates a recipe based on the given JSON input. Enter something like {\"dish\": \"curry rice\", \"people\": 3}."
      },
      {
        "flowId": "PPPPPPPPPP",
        "aliasId": "QQQQQQQQQQQ",
        "flowName": "TravelPlanFlow",
        "description": "This flow creates a travel plan based on the given array input. Enter something like [{\"place\": \"Tokyo\", \"day\": 3}, {\"place\": \"Osaka\", \"day\": 2}]."
      }
    ]
  }
}
```

### Enabling the Video Analysis Use Case

The video analysis use case allows you to analyze the content of video frames and text using an LLM.
There is no direct option to enable the image analysis use case, but multimodal models need to be enabled in `cdk.json`.

As of 2024/06, the following are multimodal models:

```
"anthropic.claude-3-5-sonnet-20241022-v2:0",
"anthropic.claude-3-5-sonnet-20240620-v1:0",
"anthropic.claude-3-opus-20240229-v1:0",
"anthropic.claude-3-sonnet-20240229-v1:0",
"anthropic.claude-3-haiku-20240307-v1:0",
"us.anthropic.claude-3-5-sonnet-20240620-v1:0",
"us.anthropic.claude-3-opus-20240229-v1:0",
"us.anthropic.claude-3-sonnet-20240229-v1:0",
"us.anthropic.claude-3-haiku-20240307-v1:0",
"eu.anthropic.claude-3-5-sonnet-20240620-v1:0",
"eu.anthropic.claude-3-sonnet-20240229-v1:0",
"eu.anthropic.claude-3-haiku-20240307-v1:0",
"us.meta.llama3-2-90b-instruct-v1:0",
"us.meta.llama3-2-11b-instruct-v1:0",
```

Any of these must be defined in the `modelIds` in `cdk.json`.
For more details, refer to [Changing Amazon Bedrock Models](#changing-amazon-bedrock-models).

```json
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "us.anthropic.claude-3-opus-20240229-v1:0",
    "us.anthropic.claude-3-sonnet-20240229-v1:0",
    "us.anthropic.claude-3-haiku-20240307-v1:0",
    "eu.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "eu.anthropic.claude-3-sonnet-20240229-v1:0",
    "eu.anthropic.claude-3-haiku-20240307-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
  ]
```

## Changing Amazon Bedrock Models

Specify the models and model region in `modelRegion`, `modelIds`, and `imageGenerationModelIds` in `cdk.json`. `modelIds` and `imageGenerationModelIds` are lists of models you want to use from the models available in the specified region. The AWS documentation lists the [available models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html) and the [models supported by region](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html).

This solution also supports [cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html) models. Cross-region inference models are represented as `{us|eu}.{model-provider}.{model-name}`, and the `{us|eu}` part must match the `modelRegion` specified in `cdk.json`.

(Example) If `modelRegion` is `us-east-1`, `us.anthropic.claude-3-5-sonnet-20240620-v1:0` is OK, but `eu.anthropic.claude-3-5-sonnet-20240620-v1:0` is not.

The text generation models supported by this solution are as follows:

```
"anthropic.claude-3-5-sonnet-20241022-v2:0",
"anthropic.claude-3-5-sonnet-20240620-v1:0",
"anthropic.claude-3-opus-20240229-v1:0",
"anthropic.claude-3-sonnet-20240229-v1:0",
"anthropic.claude-3-haiku-20240307-v1:0",
"us.anthropic.claude-3-5-sonnet-20240620-v1:0",
"us.anthropic.claude-3-opus-20240229-v1:0",
"us.anthropic.claude-3-sonnet-20240229-v1:0",
"us.anthropic.claude-3-haiku-20240307-v1:0",
"eu.anthropic.claude-3-5-sonnet-20240620-v1:0",
"eu.anthropic.claude-3-sonnet-20240229-v1:0",
"eu.anthropic.claude-3-haiku-20240307-v1:0",
"amazon.titan-text-premier-v1:0",
"us.meta.llama3-2-90b-instruct-v1:0",
"us.meta.llama3-2-11b-instruct-v1:0",
"us.meta.llama3-2-3b-instruct-v1:0",
"us.meta.llama3-2-1b-instruct-v1:0",
"meta.llama3-1-405b-instruct-v1:0",
"meta.llama3-1-70b-instruct-v1:0",
"meta.llama3-1-8b-instruct-v1:0",
"meta.llama3-70b-instruct-v1:0",
"meta.llama3-8b-instruct-v1:0",
"cohere.command-r-plus-v1:0",
"cohere.command-r-v1:0",
"mistral.mistral-large-2407-v1:0",
"mistral.mistral-large-2402-v1:0",
"mistral.mistral-small-2402-v1:0",
"anthropic.claude-v2:1",
"anthropic.claude-v2",
"anthropic.claude-instant-v1",
"meta.llama2-70b-chat-v1",
"meta.llama2-13b-chat-v1",
"mistral.mixtral-8x7b-instruct-v0:1",
"mistral.mistral-7b-instruct-v0:2"
```

The image generation models supported by this solution are as follows:

```
"amazon.titan-image-generator-v2:0",
"amazon.titan-image-generator-v1",
"stability.stable-diffusion-xl-v1",
"stability.sd3-large-v1:0",
"stability.stable-image-core-v1:0",
"stability.stable-image-ultra-v1:0"
```

**Please ensure that the specified models are enabled in Bedrock in the region specified by `modelRegion`.**

### Example of using Amazon Bedrock models in us-east-1 (Virginia)

```bash
  "modelRegion": "us-east-1",
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "amazon.titan-text-premier-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "meta.llama3-8b-instruct-v1:0",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "mistral.mistral-large-2402-v1:0"
  ],
  "imageGenerationModelIds": [
    "amazon.titan-image-generator-v2:0",
    "amazon.titan-image-generator-v1",
    "stability.stable-diffusion-xl-v1"
  ],
```

### Example of using Amazon Bedrock models in us-west-2 (Oregon)

```bash
  "modelRegion": "us-west-2",
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "mistral.mistral-large-2407-v1:0"
  ],
  "imageGenerationModelIds": [
    "amazon.titan-image-generator-v2:0",
    "amazon.titan-image-generator-v1",
    "stability.stable-diffusion-xl-v1",
    "stability.sd3-large-v1:0",
    "stability.stable-image-core-v1:0",
    "stability.stable-image-ultra-v1:0"
  ],
```

### Example of using cross-region inference models in us (Northern Virginia or Oregon) for Amazon Bedrock
```bash
  "modelRegion": "us-west-2",
  "modelIds": [
    "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "us.anthropic.claude-3-opus-20240229-v1:0",
    "us.anthropic.claude-3-sonnet-20240229-v1:0",
    "us.anthropic.claude-3-haiku-20240307-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "us.meta.llama3-2-3b-instruct-v1:0",
    "us.meta.llama3-2-1b-instruct-v1:0",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "mistral.mistral-large-2407-v1:0"
  ],
  "imageGenerationModelIds": [
    "amazon.titan-image-generator-v2:0",
    "amazon.titan-image-generator-v1",
    "stability.stable-diffusion-xl-v1",
    "stability.sd3-large-v1:0",
    "stability.stable-image-core-v1:0",
    "stability.stable-image-ultra-v1:0"
  ],
```

### Example of using Amazon Bedrock models in ap-northeast-1 (Tokyo)

```bash
  "modelRegion": "ap-northeast-1",
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0"
  ],
  "imageGenerationModelIds": [],
```

**Note: While the UI will display Stable Diffusion and Titan Image, image generation is currently not available in ap-northeast-1 as they are not supported.**

## Using Custom Models on Amazon SageMaker

You can use large language models deployed on Amazon SageMaker endpoints. This solution supports [Text Generation Inference (TGI) Hugging Face LLM inference containers](https://aws.amazon.com/blogs/machine-learning/announcing-the-launch-of-new-hugging-face-llm-inference-containers-on-amazon-sagemaker/) deployed on SageMaker Endpoints. Ideally, the models should support chat-style prompts where the user and assistant take turns speaking. Please note that the image generation use case is currently not supported for Amazon SageMaker endpoints.

There are currently two ways to deploy models using TGI containers on SageMaker Endpoints:

**Deploy pre-packaged models from SageMaker JumpStart**

SageMaker JumpStart offers pre-packaged open-source large language models that can be deployed with a single click. You can open the model from the JumpStart screen in SageMaker Studio and click "Deploy". Some examples of Japanese models offered include:

- [SageMaker JumpStart Elyza Japanese Llama 2 7B Instructt](https://aws.amazon.com/jp/blogs/news/sagemaker-jumpstart-elyza-7b/)
- [SageMaker JumpStart Elyza Japanese Llama 2 13B Instructt](https://aws.amazon.com/jp/blogs/news/sagemaker-jumpstart-elyza-7b/)
- [SageMaker JumpStart CyberAgentLM2 7B Chat](https://aws.amazon.com/jp/blogs/news/cyberagentlm2-on-sagemaker-jumpstart/)
- [SageMaker JumpStart Stable LM Instruct Alpha 7B v2](https://aws.amazon.com/jp/blogs/news/japanese-stable-lm-instruct-alpha-7b-v2-from-stability-ai-is-now-available-in-amazon-sagemaker-jumpstart/)
- [SageMaker JumpStart Rinna 3.6B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
- [SageMaker JumpStart Bilingual Rinna 4B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)

**Deploy with a few lines of code using the SageMaker SDK**

Thanks to the [collaboration between AWS and Hugging Face](https://aws.amazon.com/jp/blogs/news/aws-and-hugging-face-collaborate-to-make-generative-ai-more-accessible-and-cost-efficient/), you can deploy models published on Hugging Face by simply specifying the model ID using the SageMaker SDK.

From the published Hugging Face model page, select *Deploy* > *Amazon SageMaker* to display the code for deploying the model. Copy and run this code to deploy the model. (Depending on the model, you may need to change parameters such as the instance size or `SM_NUM_GPUS`. If the deployment fails, you can check the logs in CloudWatch Logs.)

> [!NOTE]
> When deploying, there is one modification needed. Since the endpoint name will be displayed in the GenU application and the model's prompt template (explained in the next section) is determined from the endpoint name, you need to specify an endpoint name that can distinguish the model.
> Therefore, when deploying, add `endpoint_name="<endpoint_name_to_distinguish_model>"` as an argument to `huggingface_model.deploy()`.

![Select Deploy > Amazon SageMaker from the Hugging Face model page](./assets/DEPLOY_OPTION/HF_Deploy.png)
![Deployment script guide on the Hugging Face model page](./assets/DEPLOY_OPTION/HF_Deploy2.png)

### Configuring the Deployed Model for Use in GenU

To use the deployed SageMaker endpoint in the target solution during deployment, you can specify it in `cdk.json` as follows:

`endpointNames` is a list of SageMaker endpoint names (e.g., `["elyza-llama-2", "rinna"]`).

For convenience, the endpoint name should include the prompt type (e.g., `llama-2`, `rinna`, etc.) to specify the prompt template for building the prompt on the backend. For more details, refer to `packages/cdk/lambda/utils/models.ts`. You can add additional prompt templates as needed.

```bash
  "modelRegion": "<SageMaker Endpoint Region>",
  "endpointNames": ["<SageMaker Endpoint Name>"],
```

**Example using Rinna 3.6B and Bilingual Rinna 4B**

```bash
  "modelRegion": "us-west-2",
  "endpointNames": ["jumpstart-dft-hf-llm-rinna-3-6b-instruction-ppo-bf16","jumpstart-dft-bilingual-rinna-4b-instruction-ppo-bf16"],
```

**Example using ELYZA-japanese-Llama-2-7b-instruct**

```bash
  "modelRegion": "us-west-2",
  "endpointNames": ["elyza-japanese-llama-2-7b-inference"],
```

## Security-Related Settings

### Disabling Self Sign-Up

To disable self sign-up, set `selfSignUpEnabled` to `false` in the context (default is `true`).

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "selfSignUpEnabled": false,
  }
}
```

### Restricting Sign-Up Email Domains
You can specify a list of allowed email domains for sign-up by setting `allowedSignUpEmailDomains` in the context (default is `null`).

The value should be a list of strings, without including the "@" symbol. Users with email addresses matching any of the allowed domains will be able to sign up. Setting it to `null` will allow all domains, while setting it to `[]` will prohibit sign-ups from any domain.

When set, users with email addresses not in the allowed domains will receive an error when trying to "Create Account" on the Web sign-up page or when trying to "Create User" from the Cognito service page in the AWS Management Console.

This setting does not affect existing users in Cognito. It only applies to new sign-ups or user creations.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**

Examples:

- Allow sign-ups from `amazon.com` domain

```json
{
  "context": {
    "allowedSignUpEmailDomains": ["amazon.com"], // Change from null to enable
  }
}
```

- Allow sign-ups from `amazon.com` or `amazon.jp` domains

```json
{
  "context": {
    "allowedSignUpEmailDomains": ["amazon.com", "amazon.jp"], // Change from null to enable
  }
}
```

### Enabling AWS WAF Restrictions

#### IP Address Restrictions

To restrict access to the web application by IP address, you can enable IP address restrictions using AWS WAF. In [packages/cdk/cdk.json](/packages/cdk/cdk.json), `allowedIpV4AddressRanges` allows you to specify an array of allowed IPv4 CIDR ranges, and `allowedIpV6AddressRanges` allows you to specify an array of allowed IPv6 CIDR ranges.

```json
  "context": {
    "allowedIpV4AddressRanges": ["192.168.0.0/24"], // Change from null to enable
    "allowedIpV6AddressRanges": ["2001:0db8::/32"], // Change from null to enable
```

#### Geo Restrictions

To restrict access to the web application based on the country of origin, you can enable geo restrictions using AWS WAF. In [packages/cdk/cdk.json](/packages/cdk/cdk.json), `allowedCountryCodes` allows you to specify an array of allowed country codes.
For the country codes to specify, refer to [ISO 3166-2 from wikipedia](https://en.wikipedia.org/wiki/ISO_3166-2).

If you have set both "IP Address Restrictions" and "Geo Restrictions," only access from allowed IP addresses **and** allowed countries will be permitted.

```json
  "context": {
    "allowedCountryCodes": ["JP"], // Change from null to enable
```

If you specify `allowedIpV4AddressRanges`, `allowedIpV6AddressRanges`, or `allowedCountryCodes`, and run `npm run cdk:deploy`, a stack for WAF will be deployed in us-east-1 (AWS WAF V2 currently only supports us-east-1 when used with CloudFront). If you have not used CDK in us-east-1 before, run the following command to perform Bootstrap before deployment:

```bash
npx -w packages/cdk cdk bootstrap --region us-east-1
```

### SAML Authentication

You can integrate with the SAML authentication functionality provided by Identity Providers (IdPs) such as Google Workspace or Microsoft Entra ID (formerly Azure Active Directory). Please refer to the following detailed integration procedures:

- [SAML Integration with Google Workspace](SAML_WITH_GOOGLE_WORKSPACE.md)
- [SAML Integration with Microsoft Entra ID](SAML_WITH_ENTRA_ID.md)

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**

```json
  "samlAuthEnabled": true,
  "samlCognitoDomainName": "your-preferred-name.auth.ap-northeast-1.amazoncognito.com",
  "samlCognitoFederatedIdentityProviderName": "EntraID",
```
- `samlAuthEnabled`: Setting this to `true` will switch to a SAML-only authentication screen, and the traditional authentication functionality using Cognito user pools will no longer be available.
- `samlCognitoDomainName`: Specify the Cognito Domain name set in the App integration section of Cognito.
- `samlCognitoFederatedIdentityProviderName`: Specify the name of the Identity Provider set in the Sign-in experience section of Cognito.

### Guardrails

When using the Converse API (i.e., generating text output from a generative AI model), you can apply guardrails. To configure this, change the `guardrailEnabled` key in `packages/cdk/cdk.json` to `true` and redeploy.

```json
  "context": {
    "guardrailEnabled" : true,
  }
```

By default, a sensitive information filter that has been effective in Japanese conversations is applied. We have also confirmed that custom word filters and regular expressions for sensitive information filters work, so please modify `packages/cdk/lib/construct/guardrail.ts` as needed. For more details, refer to [Guardrails for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) and [CfnGuardrail](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnGuardrail.html).

> [!NOTE]
> If you want to disable the guardrail setting after enabling it, setting `guardrailEnabled: false` and redeploying will disable the guardrail when calling the generative AI, but the guardrail itself will remain. Open the management console, navigate to CloudFormation in the `modelRegion`, and delete the `GuardrailStack` to completely remove it. While keeping the guardrail does not incur any costs, it is recommended to remove unused resources.

## Cost-Related Settings

### Scheduling Automatic Creation and Deletion of the Kendra Index

You can configure a schedule to automatically create and delete the Kendra index created by the `GenerativeAiUseCasesDashboardStack`. This can help reduce the usage costs associated with the Kendra index, which are incurred based on the uptime. After creating the Kendra index, it will automatically sync with the default S3 data source created by this repository.

This feature is only effective when `ragEnabled` in the context is `true` and `kendraIndexArn` in the context is `null` (i.e., it does not work with an externally created Kendra index).

Configure the settings as shown in the following example:
* Setting `kendraIndexScheduleEnabled` to `true` enables the scheduling, and setting it to `false` disables the scheduling after the next deployment.
* `kendraIndexScheduleCreateCron` and `kendraIndexScheduleDeleteCron` specify the start times for creation and deletion in Cron format, respectively.
  + For details on Cron format, refer to [this documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html). However, please specify the times in UTC to match the EventBridge specification. Currently, only `minute`, `hour`, `month`, and `weekDay` can be specified, and these fields are required. Other fields will be ignored if specified.
  + Setting either of these to `null` will skip the corresponding creation or deletion operation. You can set one to `null` (enabling only one operation) or set both to `null` (disabling both operations).

The following example sets the index creation to start at 8:00 AM Japan time on weekdays (Monday to Friday) and the index deletion to start at 8:00 PM Japan time on weekdays (Monday to Friday).

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**

```json
{
  "context": {
    "kendraIndexScheduleEnabled": true,
    "kendraIndexScheduleCreateCron": { "minute": "0", "hour": "23", "month": "*", "weekDay": "SUN-THU" },
    "kendraIndexScheduleDeleteCron": { "minute": "0", "hour": "11", "month": "*", "weekDay": "MON-FRI" },
  }
}
```

The RAG functionality will remain enabled even when the Kendra index is deleted. The RAG-related menus will still be displayed in the Web application (GenU). If you try to use the RAG chat when the index is deleted, an error will occur, and an error message will be displayed indicating that you should check the index creation/deletion schedule.

EventBridge rules are used for scheduling, and Step Functions are used for process control. You can stop the schedule by manually disabling the EventBridge rule. Additionally, you can manually execute the Step Functions state machine to create or delete the index.

> [!NOTE]
> - After recreating the index, the only data source that will be added is the default S3 data source created by this repository.
>   - If you had added other data sources to the existing Kendra Index, those data sources will be deleted when the index is deleted, and they will not be recreated when the index is recreated. You will need to add them again.
>   - If you added data sources in the CDK, they will be created, but they will not be synced. To sync data sources added in the CDK, you need to either manually sync the data sources or modify the [code](../packages/cdk/lib/construct/rag.ts) to add them as targets in the Step Functions state machine.
> - It takes time for the Kendra index to become available after starting the index creation. Specifically, time is required for index creation and data source synchronization. Therefore, **if you have a specific time when you want to start using the RAG chat, set the start time earlier than that**. The actual time required may vary depending on resource availability, the type of data source, the size and number of documents in the data source, so if you need to set a precise uptime, please confirm the actual time required and set it accordingly.
>   - As a rough guideline, index creation takes around 30 minutes, and data source synchronization takes around 10 minutes for a few hundred text files in an S3 data source (these are just estimates).
>   - Be especially careful if you are using external services as data sources, as the required time may vary significantly. Also, be aware of API call limits.
> - The above settings do not guarantee that the index will be stopped outside the scheduled times. It only executes the start and stop operations according to the schedule. Be mindful of the deployment timing and schedule timing.
>   - For example, if you deploy at 9:00 PM with a setting to delete at 8:00 PM, the deletion will not occur at that time, and the index will remain until the next scheduled deletion time.
>   - When creating the stack (when you run `cdk:deploy` in a state where the `GenerativeAiUseCasesStack` does not exist), if `ragEnabled` is `true`, the Kendra index will be created. Even if the schedule time is set, the index will be created. The index will remain created until the next scheduled deletion time.
> - Currently, there is no functionality to notify errors during startup or shutdown.
> - The IndexId and DataSourceId will change each time the index is recreated. If other services are referencing them, you will need to handle the changes.

## Enabling Monitoring Dashboard

A dashboard that aggregates input/output token counts, recent prompt collections, and more will be created.
**The dashboard is not embedded in GenU but is an Amazon CloudWatch dashboard.**
The Amazon CloudWatch dashboard can be viewed from the [management console](https://console.aws.amazon.com/cloudwatch/home#dashboards).
To view the dashboard, you need to create an IAM user who can log in to the management console and has permission to view the dashboard.

Set `dashboard` to `true` in the context (default is `false`).

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
```
{
  "context": {
    "dashboard": true
  }
}
```

After making the change, redeploy with `npm run cdk:deploy`. A stack named `GenerativeAiUseCasesDashboardStack` will be deployed in the region specified by `modelRegion` in the context. You will use the output values in the following steps.

Next, configure the output of Amazon Bedrock logs. Open [Amazon Bedrock Settings](https://console.aws.amazon.com/bedrock/home#settings) and enable Model invocation logging. For Select the logging destinations, choose CloudWatch Logs only (if you also want to output to S3, you can choose Both S3 and CloudWatch Logs). For Log group name, specify the `GenerativeAiUseCasesDashboardStack.BedrockLogGroup` output during `npm run cdk:deploy` (e.g., `GenerativeAiUseCasesDashboardStack-LogGroupAAAAAAAA-BBBBBBBBBBBB`). For Service role, create a new one with any name. Note that you need to configure Model invocation logging in the region specified by `modelRegion` in the context.

After completing the setup, open the `GenerativeAiUseCasesDashboardStack.DashboardUrl` output during `npm run cdk:deploy`.

> [!NOTE]
> If you want to disable the monitoring dashboard after enabling it, setting `dashboard: false` and redeploying will disable the monitoring dashboard, but the `GenerativeAiUseCasesDashboardStack` itself will remain. Open the management console, navigate to CloudFormation in the `modelRegion`, and delete the `GenerativeAiUseCasesDashboardStack` stack to completely remove it.

## Using a Custom Domain

You can use a custom domain as the URL for the website. You need to have a public hosted zone already created in Route53 within the same AWS account. For more information on public hosted zones, please refer to [Using Public Hosted Zones - Amazon Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html).

If you don't have a public hosted zone within the same AWS account, there are alternative methods such as manually adding DNS records during SSL certificate verification by AWS ACM or using email verification. If you want to use these methods, please refer to the CDK documentation and customize accordingly: [aws-cdk-lib.aws_certificatemanager module · AWS CDK](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html).

Set the following values in cdk.json:

- `hostName` ... This is the hostname of the website. The A record will be created by CDK, and you don't need to create it in advance.
- `domainName` ... This is the domain name of the pre-created public hosted zone.
- `hostedZoneId` ... This is the ID of the pre-created public hosted zone.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**

```json
{
  "context": {
    "hostName": "genai",
    "domainName": "example.com",
    "hostedZoneId": "XXXXXXXXXXXXXXXXXXXX"
  }
}
```

## Using a Different AWS Account's Bedrock

You can use Bedrock from a different AWS account. The prerequisite is that the initial deployment of GenU has been completed.

To use Bedrock from a different AWS account, you need to create one IAM role in the other AWS account. The name of the IAM role you create is arbitrary, but you need to specify the IAM role name starting with the following names created during the GenU deployment as the Principal of the IAM role you created in the other account.

- `GenerativeAiUseCasesStack-APIPredictTitleService`
- `GenerativeAiUseCasesStack-APIPredictService`
- `GenerativeAiUseCasesStack-APIPredictStreamService`
- `GenerativeAiUseCasesStack-APIGenerateImageService`

If you want to check the details on how to specify the Principal, refer to [AWS JSON Policy Elements: Principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html).

Example Principal setting (to be set in the other account)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIPredictTitleServiceXXX-XXXXXXXXXXXX",
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIPredictServiceXXXXXXXX-XXXXXXXXXXXX",
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIPredictStreamServiceXX-XXXXXXXXXXXX",
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIGenerateImageServiceXX-XXXXXXXXXXXX"
                ]
            },
            "Action": "sts:AssumeRole",
            "Condition": {}
        }
    ]
}
```

Set the following value in cdk.json:

- `crossAccountBedrockRoleArn` ... This is the ARN of the IAM role you pre-created in the other account.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**

```json
{
  "context": {
    "crossAccountBedrockRoleArn": "arn:aws:iam::<account_id>:role/<pre-created_role_name>"
  }
}
```

Example cdk.json setting

```json
{
  "context": {
    "crossAccountBedrockRoleArn": "arn:aws:iam::222222222222:role/YYYYYYYYYYYYYYYYYYYYY"
  }
}
```

After making the configuration changes, run `npm run cdk:deploy` to apply the changes.
