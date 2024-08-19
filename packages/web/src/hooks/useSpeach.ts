import { useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { Polly, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const useSpeach = () => {
  const [loading, setLoading] = useState(false);

  return {
    loading,
    synthesizeSpeach: async (text: string): Promise<string> => {
      setLoading(true);

      const token = (await fetchAuthSession()).tokens?.idToken?.toString();

      if (!token) {
        setLoading(false);
        throw new Error('認証されていません。');
      }

      const region = import.meta.env.VITE_APP_REGION;
      const userPoolId = import.meta.env.VITE_APP_USER_POOL_ID;
      const idPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID;
      const cognito = new CognitoIdentityClient({ region });
      const providerName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

      const polly = new Polly({
        region,
        credentials: fromCognitoIdentityPool({
          client: cognito,
          identityPoolId: idPoolId,
          logins: {
            [providerName]: token,
          },
        }),
      });

      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: 'Joanna', // TODO: 多言語対応
      });

      const response = await polly.send(command);
      const audioStream = response.AudioStream!.transformToWebStream();

      const audioBlob = await new Response(audioStream).blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setLoading(false);

      return audioUrl;
    },
  };
};

export default useSpeach;
