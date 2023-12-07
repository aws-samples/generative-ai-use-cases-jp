import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
  LanguageCode
} from "@aws-sdk/client-transcribe-streaming";
import {
  TranslateTextCommand,
  TranslateClient,
} from "@aws-sdk/client-translate"
import MicrophoneStream from "microphone-stream";
import { useState, useEffect } from "react";
import update from "immutability-helper";
import { Buffer } from "buffer";
import { Auth } from 'aws-amplify';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';


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

interface item {
  isPartial: boolean;
  transcript: string;
}

const useSpeech2Text = () => {
  const [micStream, setMicStream] = useState<MicrophoneStream | undefined>();
  const [recording, setRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<
    {
      isPartial: boolean;
      transcript: string;
    }[]
  >([]);
  const [transcribeClient, setTranscribeClient] = useState<TranscribeStreamingClient>();
  const [translateClient, setTranslateClient] = useState<TranslateClient>();
  const [translated, setTranslated] = useState<
    {
      isPartial: boolean;
      translated: string;
    }[]
  >([]);

  useEffect(() => {
    // break if already set
    if(transcribeClient)return

    

    Auth.currentSession().then(data => {
      const transcribe = new TranscribeStreamingClient({
        region,
        credentials: fromCognitoIdentityPool({
          client: cognito,
          identityPoolId: idPoolId,
          logins: {
            [providerName]: data.getIdToken().getJwtToken(),
          },
        }),
      });
      setTranscribeClient(transcribe)

      const translate = new TranslateClient({
        region,
        credentials: fromCognitoIdentityPool({
          client: cognito,
          identityPoolId: idPoolId,
          logins: {
            [providerName]: data.getIdToken().getJwtToken(),
          },
        }),
      });
      setTranslateClient(translate)
    })
  }, [transcribeClient]);


  const startStream = async (mic: MicrophoneStream, languageCode: LanguageCode) => {
    const audioStream = async function* () {
      for await (const chunk of mic as unknown as Buffer[]) {
        yield {
          AudioEvent: {
            AudioChunk: pcmEncodeChunk(chunk)
          },
        };
      }
    };

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: languageCode,
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 48000,
      AudioStream: audioStream(),
    });

    if(!transcribeClient)return
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
                  (alternative) => alternative.Transcript ?? ""
                ) ?? []
              ).join("");

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
      console.error(error)
      stopTranscription()
    } finally {
      stopTranscription()
      transcribeClient.destroy()
    }
  };

  const startTranscription = async (languageCode: LanguageCode) => {
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
      await startStream(mic, languageCode);
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

  const startTranslate = async (item: item, TargetLanguageCode: string) => {
    const command = new TranslateTextCommand({
      SourceLanguageCode: "en",
      TargetLanguageCode: TargetLanguageCode,
      Text: item.transcript
    });

    if (!translateClient) return
    const res = await translateClient.send(command)

    if ( res !== undefined){
      setTranslated((prev) => {

        const index = prev.length - 1;
        if (prev.length === 0 || !prev[prev.length - 1].isPartial) {

          const translated: string = res.TranslatedText!
          // segment is complete
          const tmp = update(prev, {
            $push: [
              {
                isPartial: item.isPartial ?? false,
                translated: translated,
              },
            ],
          });
          return tmp;
        }else{
          const translated: string = res.TranslatedText!
          const tmp = update(prev, {
            $splice: [
              [
                index,
                1,
                {
                  isPartial: item.isPartial ?? false,
                  translated: translated,
                },
              ],
            ],
          });
          return tmp;
        }
      });
    }
  }

  const clearTranslate = () => {
    setTranslated([])
  }
  return {
    startTranscription,
    stopTranscription,
    recording,
    transcripts,
    clearTranscripts,

    translated,
    startTranslate,
    clearTranslate,
  };
};

export default useSpeech2Text;