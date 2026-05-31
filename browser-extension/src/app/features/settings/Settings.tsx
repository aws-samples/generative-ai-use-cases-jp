import React, { useMemo } from 'react';
import InputText from '../common/components/InputText';
import useSettings from './useSettings';
import Button from '../common/components/Button';
import { PiCaretLeft } from 'react-icons/pi';
import useAuth from '../common/hooks/useAuth';
import Switch from '../common/components/Switch';
import { IconWrapper } from '../../components/IconWrapper';

const parseModelIds = (modelIds: string): string[] => {
  try {
    const parsed = JSON.parse(modelIds);
    if (Array.isArray(parsed)) {
      // ModelConfiguration[] format: [{modelId, region}, ...]
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        return parsed
          .map((m: { modelId?: string }) => m.modelId?.trim())
          .filter((id): id is string => !!id);
      }
      // string[] format
      return parsed.filter((id): id is string => typeof id === 'string' && !!id.trim());
    }
  } catch {
    // not JSON — treat as comma-separated
  }
  return modelIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

type Props = {
  onBack: () => void;
};

const Settings: React.FC<Props> = (props) => {
  const { settings, setSetting, save } = useSettings();
  const { hasAuthenticated, email, signOut } = useAuth();

  const enabledSamlAuth = useMemo(() => {
    return settings?.enabledSamlAuth ?? false;
  }, [settings?.enabledSamlAuth]);

  const modelIdList = useMemo(() => {
    return parseModelIds(settings?.modelIds ?? '');
  }, [settings?.modelIds]);

  return (
    <div className="p-2">
      <div className="text-base font-semibold mb-1">設定</div>
      <div className="font-light text-aws-font-color-gray text-xs">
        <div>拡張機能を利用するための設定を行います。</div>
        <div>この拡張機能を利用するためには、generative-ai-use-cases のデプロイが必要です。</div>
      </div>

      <div className="flex flex-col mt-3 gap-2">
        <Switch
          label="SAML 認証を利用する"
          checked={enabledSamlAuth}
          onSwitch={(val) => {
            setSetting('enabledSamlAuth', val);
          }}
        />
        {enabledSamlAuth && (
          <>
            <InputText
              label="Cognit ドメイン（SamlCognitoDomainName）"
              value={settings?.cognitoDomain ?? ''}
              onChange={(val) => {
                setSetting('cognitoDomain', val);
              }}
            />
            <InputText
              label="フェデレーテッドアイデンティティプロバイダー（SamlCognitoFederatedIdentityProviderName）"
              value={settings?.federatedIdentityProviderName ?? ''}
              onChange={(val) => {
                setSetting('federatedIdentityProviderName', val);
              }}
            />
          </>
        )}
        {!enabledSamlAuth && (
          <>
            <InputText
              label="リージョン（Region）"
              value={settings?.region ?? ''}
              onChange={(val) => {
                setSetting('region', val);
              }}
            />
            <InputText
              label="ユーザプールID（UserPoolId）"
              value={settings?.userPoolId ?? ''}
              onChange={(val) => {
                setSetting('userPoolId', val);
              }}
            />
            <InputText
              label="ユーザープールクライアントID（UserPoolClientId）"
              value={settings?.userPoolClientId ?? ''}
              onChange={(val) => {
                setSetting('userPoolClientId', val);
              }}
            />
            <InputText
              label="アイデンティティプールID（IdPoolId）"
              value={settings?.identityPoolId ?? ''}
              onChange={(val) => {
                setSetting('identityPoolId', val);
              }}
            />
            <InputText
              label="推論関数ARN（PredictStreamFunctionArn）"
              value={settings?.lambdaArn ?? ''}
              onChange={(val) => {
                setSetting('lambdaArn', val);
              }}
            />
            <InputText
              label="APIエンドポイント(ApiEndpoint)"
              value={settings?.apiEndpoint ?? ''}
              onChange={(val) => {
                setSetting('apiEndpoint', val);
              }}
            />
          </>
        )}
        <InputText
          label="モデルID一覧（ModelIds）"
          value={settings?.modelIds ?? ''}
          onChange={(val) => {
            setSetting('modelIds', val);
          }}
        />
        {modelIdList.length > 0 && (
          <div>
            <div className="text-xs text-aws-font-color-gray">使用するモデル</div>
            <select
              className="border bg-aws-squid-ink brightness-150 rounded h-8 w-full px-1"
              value={settings?.modelId ?? ''}
              onChange={(e) => {
                setSetting('modelId', e.target.value);
              }}
            >
              <option value="">-- モデルを選択 --</option>
              {modelIdList.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button
          className="mt-3"
          outlined
          icon={<IconWrapper icon={PiCaretLeft} />}
          onClick={props.onBack}
        >
          戻る
        </Button>
        <Button className="mt-3" onClick={save}>
          設定保存
        </Button>
      </div>

      <div className="mt-5">
        <div className="text-base font-semibold mb-1">ログイン情報</div>
        <div className="text-aws-font-color-gray">
          {hasAuthenticated ? (
            <div>
              <div>ログイン者：{email}</div>
              <div className="flex justify-end">
                <Button
                  outlined
                  onClick={() => {
                    signOut();
                  }}
                >
                  ログアウト
                </Button>
              </div>
            </div>
          ) : (
            <div>ログインしていません。</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
