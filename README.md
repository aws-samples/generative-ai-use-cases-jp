> [!IMPORTANT]
> This repository is for translating projects that are primarily developed for Japanese users into English. Please submit pull requests that involve changes to the business logic to the [original GenU repository](https://github.com/aws-samples/generative-ai-use-cases-jp). Also, please create issues in the original repository. We will accept pull requests for fixing issues specific to the English repository, such as typo corrections, in this repository.

# Generative AI Use Cases (Abbreviated: GenU)

Generative AI brings revolutionary possibilities for transforming businesses. GenU is an application implementation with a collection of business use cases for safely utilizing generative AI in operations.

![sc_lp.png](/imgs/sc_lp.png)

> **Due to the rapid evolution of generative AI, disruptive changes are frequently made. If an error occurs, please first check if there are any updates to the main branch.**

## Use Case List

> Use cases will be added on an ongoing basis. If you have any requests, please open an [Issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues).

<details>
  <summary>Chat</summary>

  You can interact with large language models (LLMs) in a chat format. Thanks to platforms that allow direct interaction with LLMs, we can quickly respond to specific use cases and new use cases. It is also an effective environment for verifying prompt engineering.

  <img src="/imgs/usecase_chat.gif"/>
</details>

<details>
   <summary>RAG Chat</summary>

  RAG is a method that allows LLMs to answer questions they would otherwise be unable to answer by providing the latest information or domain knowledge from external sources that LLMs struggle with. At the same time, it has the effect of preventing LLMs from responding with "plausible but incorrect information" by only allowing responses based on evidence. For example, by providing internal documents to an LLM, you can automate internal inquiries. In this repository, information is retrieved from Amazon Kendra or Knowledge Base.

  <img src="/imgs/usecase_rag.gif"/>
</details>

<details>
   <summary>Agent Chat</summary>

  Agent is a method that enables LLMs to perform various tasks by integrating with APIs. In this solution, we implement an Agent that investigates necessary information using a search engine and provides answers as a sample implementation.

  <img src="/imgs/usecase_agent.gif"/>
</details>

<details>
   <summary>Prompt Flow Chat</summary>

  With Amazon Bedrock Prompt Flows, you can create workflows by connecting prompts, base models, and other AWS services. The Prompt Flow Chat use case provides a chat interface for selecting and running pre-created Flows.

  <img src="/imgs/usecase_prompt_flow_chat.gif"/>
</details>

<details>
   <summary>Text Generation</summary>

   Generating text in various contexts is one of the tasks that LLMs excel at. It can handle articles, reports, emails, and more in any context.

  <img src="/imgs/usecase_generate_text.gif"/>
</details>

<details>
  <summary>Summarization</summary>

  LLMs are skilled at summarizing large amounts of text. Not only can they summarize, but they can also extract necessary information through a conversational format by providing the text as context. For example, you can load a contract and retrieve information such as "What are the conditions for XXX?" or "What is the amount for YYY?"

  <img src="/imgs/usecase_summarize.gif"/>
</details>

<details>
  <summary>Proofreading</summary>

  LLMs can not only check for spelling and grammatical errors but also suggest improvements from a more objective perspective, considering the flow and content of the text. By having an LLM objectively check for points you may have missed before presenting your work, you can expect to improve the quality.

  <img src="/imgs/usecase_editorial.gif"/>
</details>

<details>
  <summary>Translation</summary>

  LLMs trained on multiple languages are capable of translation. Furthermore, they can reflect various specified contextual information, such as casualness or target audience, into the translation.

  <img src="/imgs/usecase_translate.gif"/>
</details>

<details>
  <summary>Web Content Extraction</summary>

  Extracts web content such as blogs and documents. LLMs remove unnecessary information and format the extracted content into coherent sentences. The extracted content can be used in other use cases such as summarization and translation.

  <img src="/imgs/usecase_web_content.gif"/>
</details>


<details>
  <summary>Image Generation</summary>

  Image generation AI can create new images based on text or images. It allows you to instantly visualize ideas, which can be expected to improve efficiency in tasks like design work. In this feature, you can have an LLM assist in creating prompts.

  <img src="/imgs/usecase_generate_image.gif"/>
</details>


<details>
  <summary>Video Analysis</summary>

  With multimodal models, it has become possible to input not only text but also images. In this feature, we provide image frames and text from a video as input for an LLM to analyze.

  <img src="/imgs/usecase_video_analyzer.gif"/>
</details>

## Use Case Builder

The Use Case Builder is a feature that allows you to create your own use cases by describing prompt templates in natural language. Since custom use case screens are automatically generated using only prompt templates, **no code changes or customization work is required**.
Created use cases can not only be used personally but can also be shared with all users who can log into the application.

Please refer to [these deployment instructions](./docs/DEPLOY_OPTION.md#enabling-the-use-case-builder) to enable the Use Case Builder. Once enabled, a "Builder Mode" toggle switch will appear. When you turn the switch ON, the screen will change to the Use Case Builder interface.

## Architecture

This implementation uses React for the frontend, and static files are served by Amazon CloudFront + Amazon S3. The backend utilizes Amazon API Gateway + AWS Lambda, and authentication is handled by Amazon Cognito. Additionally, we use Amazon Bedrock for LLMs, and Amazon Kendra as the data source for RAG.

![arch.drawio.png](/imgs/arch.drawio.png)

## Deployment

> [!IMPORTANT]
> In this repository, the default model configuration uses Anthropic Claude 3 Sonnet (text generation) in the us-east-1 (Northern Virginia) region and Stability AI's SDXL 1.0 (image generation). Please open the [Model access screen (us-east-1)](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess), check Anthropic Claude 3 Sonnet, and click Save changes. For information on how to change the configuration to use other models (such as Anthropic Claude 3 Haiku, Meta Llama3, Cohere Command-R, etc.), please refer to [Changing the Amazon Bedrock Model](/docs/DEPLOY_OPTION.md#changing-the-amazon-bedrock-model).

We use the [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (CDK) to deploy GenU. For a step-by-step explanation or if you want to use a different deployment method, please refer to the following:
- [Workshop (Japanese)](https://catalog.workshops.aws/generative-ai-use-cases-jp)
- [Deployment Method Using AWS CloudShell (if it's difficult to set up your local environment)](/docs/DEPLOY_ON_CLOUDSHELL.md)
- [Video Introduction to the Deployment Process (Japanese)](https://www.youtube.com/watch?v=9sMA17OKP1k)

First, run the following command. All commands should be executed at the root of the repository.

```bash
npm ci
```

If you haven't used CDK before, you'll need to perform the [Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) process for the first time. This command is not necessary if you're in an environment that has already been bootstrapped.

```bash
npx -w packages/cdk cdk bootstrap
```

Then, deploy the AWS resources with the following command. Please wait for the deployment to complete (it may take around 20 minutes).

```bash
npm run cdk:deploy
```

## [Deployment Options](/docs/DEPLOY_OPTION.md)
- [How to Configure](/docs/DEPLOY_OPTION.md#how-to-configure)
  - [How to Change Values in cdk.json](/docs/DEPLOY_OPTION.md#how-to-change-values-in-cdkjson)
- [Use Case Configuration](/docs/DEPLOY_OPTION.md#use-case-configuration)
  - [Enabling the RAG Chat (Amazon Kendra) Use Case](/docs/DEPLOY_OPTION.md#enabling-the-rag-chat-amazon-kendra-use-case)
    - [Using an Existing Amazon Kendra Index](/docs/DEPLOY_OPTION.md#using-an-existing-amazon-kendra-index)
  - [Enabling the RAG Chat (Knowledge Base) Use Case](/docs/DEPLOY_OPTION.md#enabling-the-rag-chat-knowledge-base-use-case)
    - [Enabling Advanced Parsing](/docs/DEPLOY_OPTION.md#enabling-advanced-parsing)
    - [Changing the Chunking Strategy](/docs/DEPLOY_OPTION.md#changing-the-chunking-strategy)
    - [Recreating the Knowledge Base or OpenSearch Service to Apply Changes](/docs/DEPLOY_OPTION.md#recreating-the-knowledge-base-or-opensearch-service-to-apply-changes)
  - [Enabling the Agent Chat Use Case](/docs/DEPLOY_OPTION.md#enabling-the-agent-chat-use-case)
    - [Deploying the Code Interpreter Agent](/docs/DEPLOY_OPTION.md#deploying-the-code-interpreter-agent)
    - [Deploying the Search Agent](/docs/DEPLOY_OPTION.md#deploying-the-search-agent)
    - [Deploying Agents for Amazon Bedrock Knowledge Bases](/docs/DEPLOY_OPTION.md#deploying-agents-for-amazon-bedrock-knowledge-bases)
  - [Enabling the PromptFlow Chat Use Case](/docs/DEPLOY_OPTION.md#enabling-the-promptflow-chat-use-case)
  - [Enabling the Video Analysis Use Case](/docs/DEPLOY_OPTION.md#enabling-the-video-analysis-use-case)
  - [Enabling the Prompt Optimization Tool](/docs/DEPLOY_OPTION.md#enabling-the-prompt-optimization-tool)
- [Enabling the Use Case Builder](/docs/DEPLOY_OPTION.md#enabling-the-use-case-builder)
- [Changing Amazon Bedrock Models](/docs/DEPLOY_OPTION.md#changing-amazon-bedrock-models)
  - [Example of Using Amazon Bedrock Models in us-east-1 (Virginia)](/docs/DEPLOY_OPTION.md#example-of-using-amazon-bedrock-models-in-us-east-1-virginia)
  - [Example of Using Amazon Bedrock Models in us-west-2 (Oregon)](/docs/DEPLOY_OPTION.md#example-of-using-amazon-bedrock-models-in-us-west-2-oregon)
  - [Example of using cross-region inference models in us (Northern Virginia or Oregon) for Amazon Bedrock](/docs/DEPLOY_OPTION.md#example-of-using-cross-region-inference-models-in-us-northern-virginia-or-oregon-for-amazon-bedrock)
  - [Example of Using Amazon Bedrock Models in ap-northeast-1 (Tokyo)](/docs/DEPLOY_OPTION.md#example-of-using-amazon-bedrock-models-in-ap-northeast-1-tokyo)
- [Using Custom Models on Amazon SageMaker](/docs/DEPLOY_OPTION.md#using-custom-models-on-amazon-sagemaker)
  - [Configuring the Deployed Model for Use in GenU](/docs/DEPLOY_OPTION.md#configuring-the-deployed-model-for-use-in-genu)
- [Security-related Settings](/docs/DEPLOY_OPTION.md#security-related-settings)
  - [Disabling Self Sign-up](/docs/DEPLOY_OPTION.md#disabling-self-sign-up)
  - [Restricting Sign-Up Email Domains](/docs/DEPLOY_OPTION.md#restricting-sign-up-email-domains)
  - [Enabling AWS WAF Restrictions](/docs/DEPLOY_OPTION.md#enabling-aws-waf-restrictions)
    - [IP Address Restrictions](/docs/DEPLOY_OPTION.md#ip-address-restrictions)
    - [Geo Restrictions](/docs/DEPLOY_OPTION.md#geo-restrictions)
  - [SAML Authentication](/docs/DEPLOY_OPTION.md#saml-authentication)
  - [Guardrails](/docs/DEPLOY_OPTION.md#guardrails)
- [Cost-related Settings](/docs/DEPLOY_OPTION.md#cost-related-settings)
  - [Scheduling Automatic Creation and Deletion of the Kendra Index](/docs/DEPLOY_OPTION.md#scheduling-automatic-creation-and-deletion-of-the-kendra-index)
- [Enabling Monitoring Dashboard](/docs/DEPLOY_OPTION.md#enabling-monitoring-dashboard)
- [Using a Custom Domain](/docs/DEPLOY_OPTION.md#using-a-custom-domain)
- [Using a Different AWS Account's Bedrock](/docs/DEPLOY_OPTION.md#using-a-different-aws-accounts-bedrock)

## Other
 - [Update Method](/docs/UPDATE.md)
 - [Local Development Environment Setup](/docs/DEVELOPMENT.md)
 - [Resource Deletion Method](/docs/DESTROY.md)
 - [How to Use as a Native App](/docs/PWA.md)

## Cost Estimation
We have published [a configuration and cost estimation example (Japanese)](https://aws.amazon.com/jp/cdp/ai-chatapp/) for using GenU.
This cost estimation example assumes that the RAG Chat feature using Amazon Kendra is enabled.
Please note that it does not include security enhancements such as AWS WAF, file upload functionality, or options using Knowledge Base.
It is a pay-as-you-go model, and actual costs may vary depending on your usage.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
