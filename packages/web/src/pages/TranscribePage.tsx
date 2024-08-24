import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { create } from 'zustand';
import Card from '../components/Card';
import Button from '../components/Button';
import ButtonCopy from '../components/ButtonCopy';
import ButtonSendToUseCase from '../components/ButtonSendToUseCase';
import useTranscribe from '../hooks/useTranscribe';
import useMicrophone from '../hooks/useMicrophone';
import { PiMicrophone, PiMicrophoneSlash } from 'react-icons/pi';
import Switch from '../components/Switch';
import RangeSlider from '../components/RangeSlider';
import ExpandableField from '../components/ExpandableField';
import { Transcript } from 'generative-ai-use-cases-jp';
import Textarea from '../components/Textarea';
import { LanguageCode } from '@aws-sdk/client-transcribe-streaming';
import Select from '../components/Select';

const languageOptions = [
  { value: 'ja-JP', label: '日本語' },
  { value: 'en-US', label: 'English' },
];

type StateType = {
  content: Transcript[];
  setContent: (c: Transcript[]) => void;
  language: LanguageCode;
  setLanguage: (s: LanguageCode) => void;
  speakerLabel: boolean;
  setSpeakerLabel: (b: boolean) => void;
  maxSpeakers: number;
  setMaxSpeakers: (n: number) => void;
  speakers: string;
  setSpeakers: (s: string) => void;
};

const useTranscribeState = create<StateType>((set) => {
  return {
    content: [],
    language: 'ja-JP',
    speakerLabel: false,
    maxSpeakers: 2,
    speakers: '',
    setContent: (s: Transcript[]) => {
      set(() => ({
        content: s,
      }));
    },
    setLanguage: (s: LanguageCode) => {
      set(() => ({
        language: s,
      }));
    },
    setSpeakerLabel: (b: boolean) => {
      set(() => ({
        speakerLabel: b,
      }));
    },
    setMaxSpeakers: (n: number) => {
      set(() => ({
        maxSpeakers: n,
      }));
    },
    setSpeakers: (s: string) => {
      set(() => ({
        speakers: s,
      }));
    },
  };
});

const TranscribePage: React.FC = () => {
  const { loading, transcriptData, file, setFile, transcribe, clear } =
    useTranscribe();
  const {
    startTranscription,
    stopTranscription,
    transcriptMic,
    recording,
    clearTranscripts,
  } = useMicrophone();
  const {
    content,
    setContent,
    language,
    setLanguage,
    speakerLabel,
    setSpeakerLabel,
    maxSpeakers,
    setMaxSpeakers,
    speakers,
    setSpeakers,
  } = useTranscribeState();
  const ref = useRef<HTMLInputElement>(null);

  const speakerMapping = useMemo(() => {
    return Object.fromEntries(
      speakers.split(',').map((speaker, idx) => [`spk_${idx}`, speaker.trim()])
    );
  }, [speakers]);

  const formattedOutput: string = useMemo(() => {
    return content
      .map((item) =>
        item.speakerLabel
          ? `${speakerMapping[item.speakerLabel] || item.speakerLabel}: ${item.transcript}`
          : item.transcript
      )
      .join('\n');
  }, [content, speakerMapping]);

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  useEffect(() => {
    if (transcriptData && transcriptData.transcripts) {
      setContent(transcriptData.transcripts);
    }
  }, [setContent, transcriptData]);

  useEffect(() => {
    if (transcriptMic && transcriptMic.length > 0) {
      setContent(transcriptMic);
    }
  }, [setContent, transcriptMic]);

  const disabledExec = useMemo(() => {
    return !file || loading || recording;
  }, [file, loading, recording]);

  const disableClearExec = useMemo(() => {
    return (!file && content.length === 0) || loading || recording;
  }, [content, file, loading, recording]);

  const disabledMicExec = useMemo(() => {
    return loading;
  }, [loading]);

  const onClickExec = useCallback(() => {
    if (loading) return;
    setContent([]);
    stopTranscription();
    clearTranscripts();
    transcribe(speakerLabel, maxSpeakers);
  }, [
    loading,
    speakerLabel,
    maxSpeakers,
    setContent,
    stopTranscription,
    clearTranscripts,
    transcribe,
  ]);

  const onClickClear = useCallback(() => {
    if (ref.current) {
      ref.current.value = '';
    }
    setContent([]);
    stopTranscription();
    clear();
    clearTranscripts();
  }, [setContent, stopTranscription, clear, clearTranscripts]);

  const onClickExecStartTranscription = useCallback(() => {
    if (ref.current) {
      ref.current.value = '';
    }
    setContent([]);
    clear();
    clearTranscripts();
    startTranscription(language, speakerLabel);
  }, [
    language,
    speakerLabel,
    clear,
    clearTranscripts,
    setContent,
    startTranscription,
  ]);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        音声認識
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="ファイルアップロード">
          <input
            className="file:bg-aws-squid-ink block w-full cursor-pointer rounded-lg border
            border-gray-400 text-sm text-gray-900 file:mr-4 file:cursor-pointer file:border-0
            file:px-4 file:py-2 file:text-white focus:outline-none"
            onChange={onChangeFile}
            aria-describedby="file_input_help"
            id="file_input"
            type="file"
            accept=".mp3, .mp4, .wav, .flac, .ogg, .amr, .webm, .m4a"
            ref={ref}></input>
          <p
            className="mb-2 ml-0.5 mt-1 text-sm text-gray-500"
            id="file_input_help">
            mp3, mp4, wav, flac, ogg, amr, webm, m4a ファイルが利用可能です
          </p>
          <ExpandableField label="詳細なパラメータ">
            <div className="grid grid-cols-2 gap-2 pt-4">
              {!file && (
                <Select
                  label="Language"
                  options={languageOptions}
                  value={language}
                  onChange={(v) => setLanguage(v as LanguageCode)}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4">
              <Switch
                label="話者認識"
                checked={speakerLabel}
                onSwitch={setSpeakerLabel}
              />
              {speakerLabel && (
                <RangeSlider
                  className=""
                  label="Max Speakers"
                  min={2}
                  max={10}
                  value={maxSpeakers}
                  onChange={setMaxSpeakers}
                  help="認識する話者の最大数"
                />
              )}
            </div>
          </ExpandableField>
          <div className="flex justify-end gap-3">
            <Button outlined disabled={disableClearExec} onClick={onClickClear}>
              クリア
            </Button>
            <Button disabled={disabledExec} onClick={onClickExec}>
              実行
            </Button>
            {recording ? (
              <Button disabled={disabledMicExec} onClick={stopTranscription}>
                <PiMicrophone /> 音声認識中
              </Button>
            ) : (
              <Button
                outlined
                disabled={disabledMicExec}
                onClick={onClickExecStartTranscription}>
                <PiMicrophoneSlash /> 音声認識停止中
              </Button>
            )}
          </div>
          {speakerLabel && (
            <div className="mt-5">
              <Textarea
                placeholder="話し手の名前（カンマ区切り）"
                value={speakers}
                onChange={setSpeakers}
              />
            </div>
          )}
          <div className="mt-5 rounded border border-black/30 p-1.5">
            {content.length > 0 && (
              <div>
                {content.map((transcript, idx) => (
                  <div key={idx} className="flex">
                    {transcript.speakerLabel && (
                      <div className="min-w-20">
                        {speakerMapping[transcript.speakerLabel] ||
                          transcript.speakerLabel}
                        :
                      </div>
                    )}
                    <div className="grow">{transcript.transcript}</div>
                  </div>
                ))}
              </div>
            )}
            {!loading && formattedOutput == '' && (
              <div className="text-gray-500">
                音声認識結果がここに表示されます
              </div>
            )}
            {loading && (
              <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
            )}

            <div className="flex w-full justify-end">
              {content && (
                <>
                  <ButtonCopy
                    text={formattedOutput}
                    interUseCasesKey="transcript"></ButtonCopy>
                  <ButtonSendToUseCase text={formattedOutput} />
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TranscribePage;
