import { I18n } from 'aws-amplify';
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
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
        {I18n.get("settings")}
      </div>

      <div className="mx-3 mb-6 mt-5 flex flex-row items-center justify-center">
        <div className="w-2/3 text-xs lg:w-1/2">
          {I18n.get("changing_settings_not_here")}
          <Link
            className="text-aws-smile"
            to="https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html"
            target="_blank">
            AWS CDK
          </Link>
          {I18n.get("please_refer_to_jp_pt1")}
          <Link
            className="text-aws-smile"
            to="https://github.com/aws-samples/generative-ai-use-cases-jp"
            target="_blank">
            generative-ai-use-cases-jp
          </Link>
          {I18n.get("please_refer_to_jp_pt2")}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center text-sm">{I18n.get("loading")}...</div>
      )}

      {!isLoading && error && (
        <div className="flex justify-center text-sm">
          {I18n.get("could_not_be_retrieved_error")}
        </div>
      )}

      {!isLoading && !error && setting && (
        <>
          <div className="flex w-full flex-col items-center text-sm">
            <SettingItem name={I18n.get("llm_model_type")} value={setting.modelType} />
            <SettingItem name={I18n.get("llm_model_name")} value={setting.modelName} />
            <SettingItem
              name={I18n.get("llm_prompt_template")}
              value={setting.promptTemplateFile}
            />
            <SettingItem
              name={I18n.get("image_gen_model_name")}
              value={setting.imageGenModelName}
            />
            <SettingItem
              name={I18n.get("llm_model_regions")}
              value={setting.modelRegion}
            />
            <SettingItem name={I18n.get("rag_enabled")} value={ragEnabled.toString()} />
            {setting.modelType === 'bedrock' && (
              <div className="mt-5 w-2/3 text-xs lg:w-1/2">
                 {I18n.get("use_case_if_error_pt1")}
                <span className="font-bold">{setting.modelRegion}</span> {I18n.get("use_case_if_error_pt2")}
                <span className="font-bold">{setting.modelName}</span>
                {I18n.get("use_case_if_error_pt3")}
                <span className="font-bold">{setting.imageGenModelName}</span>
                {I18n.get("use_case_if_error_pt4")}
                <Link
                  className="text-aws-smile"
                  to="https://github.com/aws-samples/generative-ai-use-cases-jp"
                  target="_blank">
                  generative-ai-use-cases-jp
                </Link>
                {I18n.get("use_case_if_error_pt5")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Setting;
