import React, { useState } from 'react';
import ButtonIcon from '../ButtonIcon';
import { PiCaretRight, PiCaretUp } from 'react-icons/pi';
import ButtonCopy from '../ButtonCopy';

type PromptSampleProps = {
  title: string;
  prompt: string;
};
const PromptSample: React.FC<PromptSampleProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded border">
      <div
        className="flex cursor-pointer items-center justify-between p-2 px-3 font-bold hover:bg-gray-200"
        onClick={() => {
          setIsOpen(!isOpen);
        }}>
        {props.title}
        <PiCaretUp className={`${isOpen ? 'rotate-180' : ''} transition-all`} />
      </div>
      {isOpen && (
        <pre className="relative m-2 mt-1 whitespace-pre-wrap break-words rounded bg-gray-100 p-1 text-sm">
          {props.prompt}
          <ButtonCopy
            text={props.prompt}
            className="absolute bottom-2 right-2"
          />
        </pre>
      )}
    </div>
  );
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const UseCaseBuilderHelp: React.FC<Props> = (props) => {
  return (
    <div
      className={`${props.isOpen ? 'right-0' : '-right-96'} fixed top-0 z-[9999999] h-screen w-96 overflow-y-auto border-l bg-white px-6 py-3 shadow transition-all`}>
      <div className="mb-6 flex justify-between p-1 text-xl font-bold">
        <div>Help</div>
        <ButtonIcon onClick={props.onClose}>
          <PiCaretRight />
        </ButtonIcon>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="text-lg font-bold">
            About Prompt Template
          </div>
          <div className="mt-1 text-sm">
            You can define prompt templates for each use case. When executing a use case, the generative AI performs inference based on the prompt template defined here.
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">Variable Item Settings</div>
          <div className="mt-1 text-sm">
            Variable items can be set within prompt templates. When these variable items are set, input fields are automatically placed on the screen. When executing a use case, the variable items in the prompt template are replaced with the corresponding input values from the screen.
          </div>
        </div>
        <div>
          <div className="text-base font-bold">How to Configure Variable Items</div>
          <div className="mt-1 text-sm">
            Please input in the prompt template in the format <span className="rounded bg-gray-200 px-2 py-0.5 font-light">{'{{ text: heading }}'}</span>. "heading" will be the label for the input field displayed on the screen.
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">
            Prompt Template Sample
          </div>
          <div className="mt-1 flex flex-col gap-2">
            <PromptSample
              title="Example of email reply"
              prompt={`You are in charge of email responses.
Please create a reply email following the rules below.
<Rules>
- This is an email to a business partner. While formal language is required, since a relationship has been established, the text doesn't need to be overly formal.
- Please understand the content of the email being replied to and create a response email that aligns with the reply content.
- Never include any information in the email that cannot be inferred from the original email and reply content.
</Rules>
<Email being replied to>
{{text:Original email content}}
</Email being replied to>
<Reply content>
{{text:Reply content}}
</Reply content>`}
            />
            <PromptSample
              title="CDK code output"
              prompt={`You are an AWS expert and a skilled developer.
Users will present the system configuration they want to build.
Based on this information, please generate AWS CDK code.
However, you must follow the code generation rules without exception.

<Code Generation Rules>
- If not specified by the user, please create code in AWS CDK TypeScript.
- Add appropriate comments to make the code easy to understand.
- Generate code that is secure from a security perspective.
</Code Generation Rules>

<System Configuration to Build>
{{text: Overview of the configuration you want to generate with CDK}}
</System Configuration to Build>`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseBuilderHelp;
