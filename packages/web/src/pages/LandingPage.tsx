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
  PiImages,
} from 'react-icons/pi';
import { ReactComponent as AwsIcon } from '../assets/aws.svg';
import { I18n } from 'aws-amplify';


const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const demoChat = () => {
    navigate('/chat', {
      state: {
        content: I18n.get("fibonacci_example"),
      },
    });
  };

  const demoRag = () => {
    navigate('/rag', {
      state: {
        content: I18n.get("bedrock_security_example_q"),
      },
    });
  };

  const demoGenerate = () => {
    navigate('/generate', {
      state: {
        information: I18n.get("bedrock_security_example_a"),
        context:
          I18n.get("bedrock_security_example_c"),
      },
    });
  };

  const demoSummarize = () => {
    navigate('/summarize', {
      state: {
        sentence:
          I18n.get("bedrock_summary_example_q"),
        additionalContext: '',
      },
    });
  };

  const demoEditorial = () => {
    navigate('/editorial', {
      state: {
        sentence:
         I18n.get("editor_initial_greeting"),
      },
    });
  };

  const demoTranslate = () => {
    navigate('/translate', {
      state: {
        sentence:
          I18n.get("translation_initial_greeting")
      },
    });
  };

  const demoGenerateImage = () => {
    navigate('/image', {
      state: {
        content: I18n.get("image_gen_initial_greeting")
      },
    });
  };

  return (
    <div className="pb-24">
      <div className="bg-aws-squid-ink flex flex-col items-center justify-center px-3 py-5 text-xl font-semibold text-white lg:flex-row">
        <AwsIcon className="mr-5 h-20 w-20" />
        {I18n.get("lets_experience_gen_ai")}
      </div>

      <h1 className="mt-6 flex justify-center text-2xl font-bold">
        {I18n.get("use_case_list")}
      </h1>

      <div className="mx-3 mb-6 mt-5 flex flex-col items-center justify-center text-xs lg:flex-row">
        <Button className="mb-2 mr-0 lg:mb-0 lg:mr-2" onClick={() => {}}>
          {I18n.get("demos")}
        </Button>
        {I18n.get("click_each_use_case")}
      </div>

      <div className="mx-20 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo
          label={I18n.get('chats')}
          onClickDemo={demoChat}
          icon={<PiChatsCircle />}
          description= {I18n.get("chats_overview")}
        />
        {ragEnabled && (
          <CardDemo
            label={I18n.get("rag_chat")}
            onClickDemo={demoRag}
            icon={<PiChatCircleText />}
            description={I18n.get("rag_desc")}
          />
        )}
        <CardDemo
          label={I18n.get('text_gen')}
          onClickDemo={demoGenerate}
          icon={<PiPencil />}
          description={I18n.get("text_gen_desc")}
        />
        <CardDemo
          label={I18n.get("summarize")}
          onClickDemo={demoSummarize}
          icon={<PiNote />}
          description={I18n.get("summarize_desc")}
        />
        <CardDemo
          label={I18n.get("editor")}
          onClickDemo={demoEditorial}
          icon={<PiPenNib />}
          description={I18n.get("editor_desc")}
        />
        <CardDemo
          label={I18n.get("translation")}
          onClickDemo={demoTranslate}
          icon={<PiTranslate />}
          description={I18n.get("translation_desc")}
        />
        <CardDemo
          label={I18n.get("image_gen")}
          onClickDemo={demoGenerateImage}
          icon={<PiImages />}
          description={I18n.get("image_gen_desc")}
        />
      </div>
    </div>
  );
};

export default LandingPage;
