import useChatApi from '../hooks/useChatApi';
import { Link } from 'react-router-dom';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';

const SettingItem = (props: { name: string; value: string }) => {
  return (
    <div className="border-aws-squid-ink mb-2 w-2/3 border-b-2 border-solid lg:w-1/2">
      <div className="flex justify-between py-0.5">
        <div>{props.name}</div>
        <div>{props.value}</div>
      </div>
    </div>
  );
};

const Setting = () => {
  const { getSetting } = useChatApi();
  const { data: setting, error, isLoading } = getSetting();

  return (
    <div>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
        設定情報
      </div>

      <div className="mx-3 mb-6 mt-5 flex flex-row items-center justify-center">
        <div className="w-2/3 text-xs lg:w-1/2">
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
      </div>

      {isLoading && (
        <div className="flex justify-center text-sm">読み込み中...</div>
      )}

      {!isLoading && error && (
        <div className="flex justify-center text-sm">
          エラーで取得できませんでした
        </div>
      )}

      {!isLoading && !error && setting && (
        <>
          <div className="flex w-full flex-col items-center text-sm">
            <SettingItem name="LLM モデルタイプ" value={setting.modelType} />
            <SettingItem name="LLM モデル名" value={setting.modelName} />
            <SettingItem
              name="LLM プロンプトテンプレート"
              value={setting.promptTemplateFile}
            />
            <SettingItem
              name="画像生成 モデル名"
              value={setting.imageGenModelName}
            />
            <SettingItem
              name="LLM & 画像生成 モデルリージョン"
              value={setting.modelRegion}
            />
            <SettingItem name="RAG 有効" value={ragEnabled.toString()} />
            {setting.modelType === 'bedrock' && (
              <div className="mt-5 w-2/3 text-xs lg:w-1/2">
                ユースケース実行時にエラーになる場合は、必ず
                <span className="font-bold">{setting.modelRegion}</span> にて
                <span className="font-bold">{setting.modelName}</span>
                (LLM) と
                <span className="font-bold">{setting.imageGenModelName}</span>
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
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Setting;
