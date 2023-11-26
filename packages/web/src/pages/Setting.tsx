import useVersion from '../hooks/useVersion';
import { Link } from 'react-router-dom';
import Help from '../components/Help';
import Alert from '../components/Alert';
import useSetting from '../hooks/useSetting';
import useEndpoint from '../hooks/useEndpoint';
import Button from '../components/Button';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';

const SettingItem = (props: {
  name: string;
  values: string[];
  helpMessage?: string;
}) => {
  return (
    <div className="border-aws-squid-ink mb-2 w-2/3 border-b-2 border-solid lg:w-1/2">
      <div className="flex justify-between py-0.5">
        <div className="flex items-center">
          {props.name}
          {props.helpMessage && <Help message={props.helpMessage} />}
        </div>
        <div>
          {props.values.map((value) => (
            <div key={value} className="text-right">
              {value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Setting = () => {
  const { modelRegion, models, imageGenModels, hasSageMaker } = useSetting();
  const { status, createEndpoint, deleteEndpoint, fetchEndpoint } =
    useEndpoint();
  const { getLocalVersion, getHasUpdate } = useVersion();
  const localVersion = getLocalVersion();
  const hasUpdate = getHasUpdate();

  if (hasSageMaker) {
    fetchEndpoint();
  }

  return (
    <div>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
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
          values={[localVersion || '取得できませんでした']}
          helpMessage="generative-ai-use-cases-jp の package.json の version を参照しています"
        />
        <SettingItem name="RAG 有効" values={[ragEnabled.toString()]} />
      </div>

      <div className="my-3 flex justify-center font-semibold">生成系 AI</div>

      <div className="flex w-full flex-col items-center text-sm">
        <SettingItem
          name="LLM モデル名"
          values={models.map((model) => model.modelName)}
        />
        <SettingItem
          name="画像生成 モデル名"
          values={imageGenModels.map((model) => model.modelName)}
        />
        <SettingItem
          name="LLM & 画像生成 モデルリージョン"
          values={[modelRegion]}
        />
        <div className="mt-5 w-2/3 text-xs lg:w-1/2">
          設定の変更はこの画面ではなく
          <Link
            className="text-aws-smile"
            to="https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html"
            target="_blank">
            AWS CDK
          </Link>
          で行います。方法については
          <Link
            className="text-aws-smile"
            to="https://github.com/aws-samples/generative-ai-use-cases-jp"
            target="_blank">
            generative-ai-use-cases-jp
          </Link>
          をご参照ください。
        </div>
        {
          <div className="mt-5 w-2/3 text-xs lg:w-1/2">
            ユースケース実行時にエラーになる場合は、必ず
            <span className="font-bold">{modelRegion}</span> にて
            <span className="font-bold">
              {models.map((model) => model.modelName)}
            </span>
            (LLM) と
            <span className="font-bold">
              {imageGenModels.map((model) => model.modelName)}
            </span>
            (画像生成)
            を有効化しているか確認してください。有効化する方法については
            <Link
              className="text-aws-smile"
              to="https://github.com/aws-samples/generative-ai-use-cases-jp"
              target="_blank">
              generative-ai-use-cases-jp
            </Link>
            をご参照ください。
          </div>
        }
      </div>

      {hasSageMaker && (
        <>
          <div className="my-3 flex justify-center font-semibold">
            SageMaker Endpoint
          </div>

          <div className="flex w-full flex-col items-center text-sm">
            <div className="border-aws-squid-ink mb-2 w-2/3 border-b-2 border-solid lg:w-1/2">
              <div className="flex justify-between py-0.5">
                <div className="flex items-center">ステータス</div>
                <div className="flex items-center">
                  <span className="mr-2">{status}</span>
                  {status === 'OutOfService' && (
                    <Button onClick={createEndpoint}>起動</Button>
                  )}
                  {['InService', 'Failed'].includes(status) && (
                    <Button onClick={deleteEndpoint}>停止</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Setting;
