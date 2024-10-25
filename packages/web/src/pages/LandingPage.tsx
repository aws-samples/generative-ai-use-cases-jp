import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardDemo from '../components/CardDemo';
import Button from '../components/Button';
import {
  PiChatCircleText,
  PiPencil,
  PiNote,
  PiChatsCircle,
  PiPenNib,
  PiTranslate,
  PiGlobe,
  PiImages,
  PiNotebook,
  PiPen,
  PiRobot,
  PiVideoCamera,
  PiFlowArrow,
} from 'react-icons/pi';
import AwsIcon from '../assets/aws.svg?react';
import useInterUseCases from '../hooks/useInterUseCases';
import {
  AgentPageQueryParams,
  ChatPageQueryParams,
  EditorialPageQueryParams,
  GenerateImagePageQueryParams,
  GenerateTextPageQueryParams,
  InterUseCaseParams,
  RagPageQueryParams,
  SummarizePageQueryParams,
  TranslatePageQueryParams,
  WebContentPageQueryParams,
  VideoAnalyzerPageQueryParams,
} from '../@types/navigate';
import queryString from 'query-string';
import { MODELS } from '../hooks/useModel';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const { multiModalModelIds } = MODELS;
const multiModalEnabled: boolean = multiModalModelIds.length > 0;
const getPromptFlows = () => {
  try {
    return JSON.parse(import.meta.env.VITE_APP_PROMPT_FLOWS);
  } catch (e) {
    return [];
  }
};
const promptFlows = getPromptFlows();
const promptFlowChatEnabled: boolean = promptFlows.length > 0;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setIsShow, init } = useInterUseCases();

  const demoChat = () => {
    const params: ChatPageQueryParams = {
      content: `Please write a Python function that returns the Fibonacci numbers. Also, please explain the implementation.
The argument should be the term, and the logic should be done recursively. Please output them in Markdown format.`,
      systemContext: '',
    };
    navigate(`/chat?${queryString.stringify(params)}`);
  };

  const demoRag = () => {
    const params: RagPageQueryParams = {
      content: `Please explain Claude's parameters and how to configure them.`,
    };
    navigate(`/rag?${queryString.stringify(params)}`);
  };

  const demoRagKnowledgeBase = () => {
    const params: RagPageQueryParams = {
      content: `Please explain Claude's parameters and how to configure them.`,
    };
    navigate(`/rag-knowledge-base?${queryString.stringify(params)}`);
  };

  const demoAgent = () => {
    const params: AgentPageQueryParams = {
      content: `What is the generative-ai-use-cases-jp?`,
    };
    navigate(`/agent?${queryString.stringify(params)}`);
  };

  const demoGenerate = () => {
    const params: GenerateTextPageQueryParams = {
      information: `Amazon Bedrock is a fully managed service that allows you to use high-performance foundation models (FMs) from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Stability AI, and Amazon through a single API. It also provides a comprehensive set of capabilities needed to build generative AI applications, simplifying development while maintaining privacy and security. With Amazon Bedrock's extensive features, you can easily try out various top FMs, customize them privately using techniques like fine-tuning and retrieval-augmented generation (RAG) with your data, and create managed agents to handle complex business tasks, from booking travel or processing insurance claims to creating advertising campaigns or managing inventory, all without writing any code. As a serverless offering, Amazon Bedrock eliminates the need to manage infrastructure. You can also securely integrate and deploy generative AI capabilities into your applications using familiar AWS services.`,
      context:
        'presentation, outline chapters in Markdown format, concise explanation',
    };
    navigate(`/generate?${queryString.stringify(params)}`);
  };

  const demoSummarize = () => {
    const params: SummarizePageQueryParams = {
      sentence: `Amazon Bedrock is a fully managed service that allows you to use high-performance foundation models (FMs) from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Stability AI, and Amazon through a single API. It also provides a comprehensive set of capabilities needed to build generative AI applications, simplifying development while maintaining privacy and security. With Amazon Bedrock's extensive features, you can easily try out various top FMs, customize them privately using techniques like fine-tuning and retrieval-augmented generation (RAG) with your data, and create managed agents to handle complex business tasks, from booking travel or processing insurance claims to creating advertising campaigns or managing inventory, all without writing any code. As a serverless offering, Amazon Bedrock eliminates the need to manage infrastructure. You can also securely integrate and deploy generative AI capabilities into your applications using familiar AWS services.`,
      additionalContext: 'in bullet points',
    };
    navigate(`/summarize?${queryString.stringify(params)}`);
  };

  const demoEditorial = () => {
    const params: EditorialPageQueryParams = {
      sentence:
        'Helo. I am a perfect AI assistant to help with proofread. Plese enter the text of your choise.',
    };
    navigate(`/editorial?${queryString.stringify(params)}`);
  };

  const demoTranslate = () => {
    const params: TranslatePageQueryParams = {
      sentence:
        'Hello, I am an AI assistant designed to help with translations. Please enter the text you want translated.',
      additionalContext: '',
      language: 'Japanese',
    };
    navigate(`/translate?${queryString.stringify(params)}`);
  };

  const demoWebContent = () => {
    const params: WebContentPageQueryParams = {
      url: 'https://aws.amazon.com/bedrock/',
      context: '',
    };
    navigate(`/web-content?${queryString.stringify(params)}`);
  };

  const demoGenerateImage = () => {
    const params: GenerateImagePageQueryParams = {
      content: `Based on the following keywords, please generate design proposals for a smartphone advertisement. Please make sure the smartphone is clearly visible.
Cute, stylish, user-friendly, approachable, youth-oriented, trendy smartphone, city background`,
    };
    navigate(`/image?${queryString.stringify(params)}`);
  };

  const demoVideoAnalyzer = () => {
    const params: VideoAnalyzerPageQueryParams = {
      content:
        'Please describe what is shown in the image. If there is any text written on the things shown, please read that as well.',
    };
    navigate(`/video?${queryString.stringify(params)}`);
  };

  const demoBlog = () => {
    setIsShow(true);
    init('Authoring a Blog Post', [
      {
        title: 'Retrieve Information',
        description: `Please specify a URL to retrieve information related to the article. By setting additional context, you can extract only the information you need.`,
        path: 'web-content',
        params: {
          url: {
            value: 'https://aws.amazon.com/what-is/generative-ai/',
          },
          context: {
            value:
              'Please extract only the parts explaining an overview and mechanisms of generative AI, and the parts describing AWS',
          },
        } as InterUseCaseParams<WebContentPageQueryParams>,
      },
      {
        title: 'Generate the Article',
        description:
          'This step generates blog posts based on the reference information. By setting the context in detail, the generated articles will more closely align with your intended content.',
        path: 'generate',
        params: {
          context: {
            value: `Please generate a blog post explaining the mechanisms of generative AI and the benefits of using generative AI with AWS. When generating the article, be sure to follow the rules enclosed within <rules></rules>.
<rules>
- Write the article in an outlined format using Markdown.
- Target the article towards beginners in generative AI and AWS.
- Avoid using jargon that IT beginners may not understand, or replace it with more understandable language.
- Make sure the article explains what can be done with generative AI.
- If the amount of text is too little and may not satisfy readers, supplement it with additional general information to increase the word count.
- Write in a way that captures the reader's interest.
</rules>`,
          },
          information: {
            value: '{content}',
          },
        } as InterUseCaseParams<GenerateTextPageQueryParams>,
      },
      {
        title: 'Summarize the Article',
        description:
          'This step summarizes the article for the OGP preview that is displayed when sharing a link to the article. Setting the OGP properly allows the summary of the article to be accurately conveyed when the article is shared.',
        path: 'summarize',
        params: {
          sentence: {
            value: '{text}',
          },
        } as InterUseCaseParams<SummarizePageQueryParams>,
      },
      {
        title: 'Generate Thumbnails',
        description: `This step generates a thumbnail image for the OGP preview that is displayed when sharing a link to the article. Setting an eye-catching thumbnail for the OGP could potentially grab the reader's interest`,
        path: 'image',
        params: {
          content: {
            value: `Please generate a thumbnail image for the blog article's Open Graph Protocol (OGP) preview. Please make it an image that clearly conveys that the article is about cloud or AI. The summary of the blog article is set within <article></article>.
<article>
{summarizedSentence}
</article>`,
          },
        } as InterUseCaseParams<GenerateImagePageQueryParams>,
      },
    ]);
  };

  const demoMeetingReport = () => {
    setIsShow(true);
    init('Generating Minutes', [
      {
        title: 'Transcribe the Recording',
        description: `Using the 'Speech-to-Text' feature, this step transcribes the conversation content from an audio recording. Please provide any audio file to run this on.
Once the speech-to-text is complete, press the 'Format text' button (the speech-to-text result will be automatically copied).`,
        path: 'transcribe',
      },
      {
        title: 'Format text',
        description: `Using the "Text Generation" feature, this step refines the transcription. It'll remove filler words and correct parts where speech recognition wasn't accurate, making it easier for people to understand.`,
        path: 'generate',
        params: {
          context: {
            value: `The transcription results from the recorded data will be input. Please format them according to the <rules></rules> provided.
<rules>
- Remove filler words.
- If there appears to be a misrecognition in the transcription, rewrite it with the correct content.
- If conjunctions or other words are omitted, supplement them to make it more readable.
- Include QA portions without omitting them.
</rules>`,
          },
          information: {
            value: '{transcript}',
          },
        } as InterUseCaseParams<GenerateTextPageQueryParams>,
      },
      {
        title: 'Generate Minutes',
        description: `Using the 'Text Generation' feature, this step generates the minutes of the meeting. By specifying the context in detail, you can instruct the format of the minutes and the level of detail to be included.`,
        path: 'generate',
        params: {
          context: {
            value: `Based on the transcription of the meeting, please generate minutes in Markdown format. Please create separate sections for each topic discussed, and summarize the discussions, decisions made, and action items assigned under each section.`,
          },
          information: {
            value: '{text}',
          },
        } as InterUseCaseParams<GenerateTextPageQueryParams>,
      },
    ]);
  };

  const demoPromptFlowChat = () => {
    navigate(`/prompt-flow-chat`);
  };

  return (
    <div className="pb-24">
      <div className="bg-aws-squid-ink flex flex-col items-center justify-center px-3 py-5 text-xl font-semibold text-white lg:flex-row">
        Generative AI on
        <AwsIcon className="ml-5 size-20" />
      </div>

      <div className="mx-3 mb-6 mt-5 flex flex-col items-center justify-center text-xs lg:flex-row">
        By clicking
        <Button className="mx-0 mb-2 lg:mx-2 lg:mb-0" onClick={() => {}}>
          Try
        </Button>
        you can experience each use case.
      </div>

      <h1 className="mb-6 flex justify-center text-2xl font-bold">Use Cases</h1>

      <div className="mx-20 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo
          label="Chat"
          onClickDemo={demoChat}
          icon={<PiChatsCircle />}
          description="You can interact with large language models (LLMs) in a chat format. Thanks to platforms that allow direct interaction with LLMs, we can quickly respond to specific use cases and new use cases. It is also an effective environment for verifying prompt engineering."
        />
        {ragEnabled && (
          <CardDemo
            label="RAG Chat"
            sub="Amazon Kendra"
            onClickDemo={demoRag}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) is a method that combines information retrieval and LLM text generation, enabling effective information access. Since LLM generates responses based on reference documents obtained from Amazon Kendra, it is possible to easily realize LLM chat that corresponds to internal information."
          />
        )}
        {ragKnowledgeBaseEnabled && (
          <CardDemo
            label="RAG Chat"
            sub="Knowledge Base"
            onClickDemo={demoRagKnowledgeBase}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) is a method that combines information retrieval and LLM text generation, enabling effective information access. Since LLM generates responses based on reference documents obtained from Knowledge Base, it is possible to easily realize LLM chat that corresponds to internal information."
          />
        )}
        {agentEnabled && (
          <CardDemo
            label="Agent Chat"
            onClickDemo={demoAgent}
            icon={<PiRobot />}
            description="Agent is a method that enables LLMs to perform various tasks by integrating with APIs. In this solution, we implement an Agent that investigates necessary information using a search engine and provides answers as a sample implementation."
          />
        )}
        {promptFlowChatEnabled && (
          <CardDemo
            label="Prompt Flow Chat"
            onClickDemo={demoPromptFlowChat}
            icon={<PiFlowArrow />}
            description="With Amazon Bedrock Prompt Flows, you can create workflows by connecting prompts, base models, and other AWS services. The Prompt Flow Chat use case provides a chat interface for selecting and running pre-created Flows."
          />
        )}
        <CardDemo
          label="Text Generation"
          onClickDemo={demoGenerate}
          icon={<PiPencil />}
          description="Generating text in various contexts is one of the tasks that LLMs excel at. It can handle articles, reports, emails, and more in any context."
        />
        <CardDemo
          label="Summarization"
          onClickDemo={demoSummarize}
          icon={<PiNote />}
          description="LLMs are skilled at summarizing large amounts of text. Not only can they summarize, but they can also extract necessary information through a conversational format by providing the text as context. For example, you can load a contract and retrieve information such as What are the conditions for XXX? or What is the amount for YYY?"
        />
        <CardDemo
          label="Proofreading"
          onClickDemo={demoEditorial}
          icon={<PiPenNib />}
          description="LLMs can not only check for spelling and grammatical errors but also suggest improvements from a more objective perspective, considering the flow and content of the text. By having an LLM objectively check for points you may have missed before presenting your work, you can expect to improve the quality."
        />
        <CardDemo
          label="Translation"
          onClickDemo={demoTranslate}
          icon={<PiTranslate />}
          description="LLMs trained on multiple languages are capable of translation. Furthermore, they can reflect various specified contextual information, such as casualness or target audience, into the translation."
        />
        <CardDemo
          label="Web Content Extraction"
          onClickDemo={demoWebContent}
          icon={<PiGlobe />}
          description="Extracts web content such as blogs and documents. LLMs remove unnecessary information and format the extracted content into coherent sentences. The extracted content can be used in other use cases such as summarization and translation."
        />
        <CardDemo
          label="Image Generation"
          onClickDemo={demoGenerateImage}
          icon={<PiImages />}
          description="Image generation AI can create new images based on text or images. It allows you to instantly visualize ideas, which can be expected to improve efficiency in tasks like design work. In this feature, you can have an LLM assist in creating prompts."
        />
        {multiModalEnabled && (
          <CardDemo
            label="Video Analysis"
            onClickDemo={demoVideoAnalyzer}
            icon={<PiVideoCamera />}
            description="With multimodal models, it has become possible to input not only text but also images. In this feature, we provide image frames and text from a video as input for an LLM to analyze."
          />
        )}
      </div>

      <h1 className="mb-6 mt-12 flex justify-center text-2xl font-bold">
        Use Case Integration
      </h1>

      <div className="mx-20 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo
          label="Authoring a Blog Post"
          onClickDemo={demoBlog}
          icon={<PiPen />}
          description="It combines multiple use cases to generate blog posts. By automatically generating article summaries and thumbnail images, it also makes it easy to set up OGP. As an example, it generates a blog post introducing AI generation based on information from the AWS official website."
        />
        <CardDemo
          label="Generating Minutes"
          onClickDemo={demoMeetingReport}
          icon={<PiNotebook />}
          description="It combines multiple use cases to automatically generate minutes from meeting recording data. It is possible to transcribe recording data, format transcription results, and create minutes without human cost."
        />
      </div>
    </div>
  );
};

export default LandingPage;
