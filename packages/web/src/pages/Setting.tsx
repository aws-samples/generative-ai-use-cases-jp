import useVersion from '../hooks/useVersion';
import { Link } from 'react-router-dom';
import Help from '../components/Help';
import Alert from '../components/Alert';
import Button from '../components/Button';
import { MODELS } from '../hooks/useModel';
import useGitHub, { PullRequest } from '../hooks/useGitHub';
import { PiGithubLogoFill, PiArrowSquareOut } from 'react-icons/pi';
import { useAuthenticator } from '@aws-amplify/ui-react';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';

const SettingItem = (props: {
  name: string;
  value: string;
  helpMessage?: string;
}) => {
  return (
    <div className="border-aws-squid-ink mb-2 w-2/3 border-b-2 border-solid lg:w-1/2">
      <div className="flex justify-between py-0.5">
        <div className="flex items-center">
          {props.name}
          {props.helpMessage && <Help message={props.helpMessage} />}
        </div>
        <div className="text-right">{props.value}</div>
      </div>
    </div>
  );
};

const Setting = () => {
  const { modelRegion, modelIds, imageGenModelIds, agentNames } = MODELS;
  const { getLocalVersion, getHasUpdate } = useVersion();
  const { getClosedPullRequests } = useGitHub();
  const { signOut } = useAuthenticator();

  const localVersion = getLocalVersion();
  const hasUpdate = getHasUpdate();
  const closedPullRequests = getClosedPullRequests();

  return (
    <div>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        Settings information
      </div>

      {hasUpdate && (
        <div className="mt-5 flex w-full justify-center">
          <Alert severity="info" className="flex w-fit items-center">
            There is an update on GitHub. If you want to use the latest
            features, please pull the main branch from{' '}
            <Link
              className="text-aws-smile"
              to="https://github.com/aws-samples/generative-ai-use-cases-jp"
              target="_blank">
              generative-ai-use-cases-jp
            </Link>{' '}
            and redeploy.
          </Alert>
        </div>
      )}

      <div className="my-3 flex justify-center font-semibold">General</div>

      <div className="flex w-full flex-col items-center text-sm">
        <SettingItem
          name="Version"
          value={localVersion || 'Cannot get the version'}
          helpMessage="Referring to the version in the package.json of generative-ai-use-cases-jp"
        />
        <SettingItem
          name="RAG (Amazon Kendra) enabled"
          value={ragEnabled.toString()}
        />
        <SettingItem
          name="RAG (Knowledge Base) enabled"
          value={ragKnowledgeBaseEnabled.toString()}
        />
        <SettingItem name="Agent enabled" value={agentEnabled.toString()} />
      </div>

      <div className="my-3 flex justify-center font-semibold">
        Generative AI
      </div>

      <div className="flex w-full flex-col items-center text-sm">
        <SettingItem name="LLM models" value={modelIds.join(', ')} />
        <SettingItem
          name="Image generation models"
          value={imageGenModelIds.join(', ')}
        />
        <SettingItem name="Agent names" value={agentNames.join(', ')} />
        <SettingItem
          name="Model region for LLM & image generation"
          value={modelRegion}
        />
        <div className="mt-5 w-2/3 text-xs lg:w-1/2">
          The settings cannot be changed on this screen, but rather through{' '}
          <Link
            className="text-aws-smile"
            to="https://docs.aws.amazon.com/en_us/cdk/v2/guide/home.html"
            target="_blank">
            AWS CDK
          </Link>
          . If you encounter an error while running a use case, make sure to
          enable the model specified in{' '}
          <span className="font-bold">{modelRegion}</span>. For more information
          on how to do this, please refer to{' '}
          <Link
            className="text-aws-smile"
            to="https://github.com/aws-samples/generative-ai-use-cases-jp"
            target="_blank">
            generative-ai-use-cases-jp
          </Link>
          .
        </div>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-center font-semibold">
        <PiGithubLogoFill className="mr-2 text-lg" />
        Recent updates
      </div>

      <div className="flex flex-col items-center text-sm">
        <ul className="h-64 w-2/3 overflow-y-scroll border border-gray-400 p-1 lg:w-1/2">
          {closedPullRequests.map((p: PullRequest, idx: number) => {
            return (
              <li key={idx} className="block truncate text-sm">
                <a href={p.url} className="hover:underline" target="_blank">
                  {p.mergedAt.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}{' '}
                  {p.title}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-1 flex w-2/3 justify-end text-xs lg:w-1/2">
          <a
            href="https://github.com/aws-samples/generative-ai-use-cases-jp/pulls?q=is%3Apr+is%3Aclosed"
            className="flex items-center hover:underline"
            target="_blank">
            <PiArrowSquareOut className="mr-1 text-base" />
            View all updates
          </a>
        </div>
      </div>

      <div className="my-10 flex w-full justify-center">
        <Button onClick={signOut} className="text-lg">
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default Setting;
