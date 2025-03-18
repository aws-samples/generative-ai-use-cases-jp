import useVersion from '../hooks/useVersion';
import { Link } from 'react-router-dom';
import Help from '../components/Help';
import Alert from '../components/Alert';
import Button from '../components/Button';
import { MODELS } from '../hooks/useModel';
import useGitHub, { PullRequest } from '../hooks/useGitHub';
import { PiGithubLogoFill, PiArrowSquareOut } from 'react-icons/pi';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

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
  const {
    modelRegion,
    modelIds,
    imageGenModelIds,
    videoGenModelIds,
    agentNames,
  } = MODELS;
  const { cache } = useSWRConfig();
  const { getLocalVersion, getHasUpdate } = useVersion();
  const { getClosedPullRequests } = useGitHub();
  const { signOut } = useAuthenticator();

  const localVersion = getLocalVersion();
  const hasUpdate = getHasUpdate();
  const closedPullRequests = getClosedPullRequests();

  const onClickSignout = useCallback(() => {
    // SWRのキャッシュを全て削除する
    for (const key of cache.keys()) {
      cache.delete(key);
    }
    signOut();
  }, [cache, signOut]);

  return (
    <div>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        設定情報
      </div>

      {hasUpdate && (
        <div className="mt-5 flex w-full justify-center">
          <Alert severity="info" className="flex w-fit items-center">
            GitHub にアップデートがあります。最新の機能を利用したい場合は
            <Link
              className="text-aws-smile"
              to="https://github.com/aws-samples/generative-ai-use-cases-jp"
              target="_blank">
              generative-ai-use-cases-jp
            </Link>
            の main ブランチを pull して再度デプロイしてください。
          </Alert>
        </div>
      )}

      <div className="my-3 flex justify-center font-semibold">全般</div>

      <div className="flex w-full flex-col items-center text-sm">
        <SettingItem
          name="バージョン"
          value={localVersion || '取得できませんでした'}
          helpMessage="generative-ai-use-cases-jp の package.json の version を参照しています"
        />
        <SettingItem
          name="RAG (Amazon Kendra) 有効"
          value={ragEnabled.toString()}
        />
        <SettingItem
          name="RAG (Knowledge Base) 有効"
          value={ragKnowledgeBaseEnabled.toString()}
        />
        <SettingItem name="Agent 有効" value={agentEnabled.toString()} />
      </div>

      <div className="my-3 flex justify-center font-semibold">生成 AI</div>

      <div className="flex w-full flex-col items-center text-sm">
        <SettingItem name="LLM モデル名" value={modelIds.join(', ')} />
        <SettingItem
          name="画像生成 モデル名"
          value={imageGenModelIds.join(', ')}
        />
        <SettingItem
          name="動画生成 モデル名"
          value={videoGenModelIds.join(', ')}
        />
        <SettingItem name="Agent 名" value={agentNames.join(', ')} />
        <SettingItem
          name="LLM & 画像生成 モデルリージョン"
          value={modelRegion}
        />
        <div className="mt-5 w-2/3 text-xs lg:w-1/2">
          設定の変更はこの画面ではなく
          <Link
            className="text-aws-smile"
            to="https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html"
            target="_blank">
            AWS CDK
          </Link>
          で行います。 また、ユースケース実行時にエラーになる場合は、必ず
          <span className="font-bold">{modelRegion}</span> にて指定したモデル
          を有効化しているか確認してください。それぞれのやり方については
          <Link
            className="text-aws-smile"
            to="https://github.com/aws-samples/generative-ai-use-cases-jp"
            target="_blank">
            generative-ai-use-cases-jp
          </Link>
          をご参照ください。
        </div>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-center font-semibold">
        <PiGithubLogoFill className="mr-2 text-lg" />
        最近のアップデート
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
            全てのアップデートを見る
          </a>
        </div>
      </div>

      <div className="my-10 flex w-full justify-center">
        <Button onClick={onClickSignout} className="text-lg">
          サインアウト
        </Button>
      </div>
    </div>
  );
};

export default Setting;
