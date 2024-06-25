import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from '@aws-sdk/client-transcribe-streaming';
import MicrophoneStream from 'microphone-stream';
import { useState, useEffect } from 'react';
import update from 'immutability-helper';
import { Buffer } from 'buffer';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fetchAuthSession } from 'aws-amplify/auth';

const pcmEncodeChunk = (chunk: Buffer) => {
  const input = MicrophoneStream.toRaw(chunk);
  let offset = 0;
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return Buffer.from(buffer);
};

const region = import.meta.env.VITE_APP_REGION;
const cognito = new CognitoIdentityClient({ region });
const userPoolId = import.meta.env.VITE_APP_USER_POOL_ID;
const idPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID;
const providerName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const useMicrophone = () => {
  const [micStream, setMicStream] = useState<MicrophoneStream | undefined>();
  const [recording, setRecording] = useState(false);
  const [transcriptMic, setTranscripts] = useState<
    {
      isPartial: boolean;
      transcript: string;
    }[]
  >([]);
  const [transcribeClient, setTranscribeClient] =
    useState<TranscribeStreamingClient>();

  useEffect(() => {
    // break if already set
    if (transcribeClient) return;

    fetchAuthSession().then((session) => {
      const token = session.tokens?.idToken?.toString();
      // break if unauthenticated
      if (!token) {
        return;
      }

      const transcribe = new TranscribeStreamingClient({
        region,
        credentials: fromCognitoIdentityPool({
          client: cognito,
          identityPoolId: idPoolId,
          logins: {
            [providerName]: token,
          },
        }),
      });
      setTranscribeClient(transcribe);
    });
  }, [transcribeClient]);

  const startStream = async (mic: MicrophoneStream) => {
    if (!transcribeClient) return;

    const audioStream = async function* () {
      for await (const chunk of mic as unknown as Buffer[]) {
        yield {
          AudioEvent: {
            AudioChunk: pcmEncodeChunk(chunk),
          },
        };
      }
    };

    const command = new StartStreamTranscriptionCommand({
      // LanguageCode: languageCode,
      IdentifyLanguage: true,
      LanguageOptions: 'en-US,ja-JP',
      MediaEncoding: 'pcm',
      MediaSampleRateHertz: 48000,
      AudioStream: audioStream(),
    });

    try {
      const response = await transcribeClient.send(command);

      if (response.TranscriptResultStream) {
        // This snippet should be put into an async function
        for await (const event of response.TranscriptResultStream) {
          if (
            event.TranscriptEvent?.Transcript?.Results &&
            event.TranscriptEvent.Transcript?.Results.length > 0
          ) {
            // Get multiple possible results, but this code only processes a single result
            const result = event.TranscriptEvent.Transcript?.Results[0];

            setTranscripts((prev) => {
              // transcript from array to string
              const transcript = (
                result.Alternatives?.map(
                  (alternative) => alternative.Transcript ?? ''
                ) ?? []
              ).join('');

              const index = prev.length - 1;

              if (prev.length === 0 || !prev[prev.length - 1].isPartial) {
                // segment is complete
                const tmp = update(prev, {
                  $push: [
                    {
                      isPartial: result.IsPartial ?? false,
                      transcript,
                    },
                  ],
                });
                return tmp;
              } else {
                // segment is NOT complete(overrides the previous segment's transcript)
                const tmp = update(prev, {
                  $splice: [
                    [
                      index,
                      1,
                      {
                        isPartial: result.IsPartial ?? false,
                        transcript,
                      },
                    ],
                  ],
                });
                return tmp;
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      stopTranscription();
    } finally {
      stopTranscription();
      transcribeClient.destroy();
    }
  };

  const startTranscription = async () => {
    const mic = new MicrophoneStream();
    try {
      setMicStream(mic);
      mic.setStream(
        await window.navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        })
      );

      setRecording(true);
      await startStream(mic);
    } catch (e) {
      console.log(e);
    } finally {
      mic.stop();
      setRecording(false);
      setMicStream(undefined);
    }
  };

  const stopTranscription = () => {
    if (micStream) {
      micStream.stop();
      setRecording(false);
      setMicStream(undefined);
    }
  };

  const clearTranscripts = () => {
    setTranscripts([]);
  };

  return {
    startTranscription,
    stopTranscription,
    recording,
    transcriptMic,
    clearTranscripts,
  };
};

export default useMicrophone;
