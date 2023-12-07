import { useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';

import { create } from 'zustand';
import Card from '../components/Card';
import Button from '../components/Button';
import useSpeech2Text from "../hooks/useRealtimeTranslate";
import MenuDropdown from '../components/MenuDropdown';
import MenuItem from '../components/MenuItem';
import useScroll from '../hooks/useScroll';
import {
  LanguageCode
} from "@aws-sdk/client-transcribe-streaming";
import { PiCaretDown } from 'react-icons/pi';

interface Language {
  label: string;
  translateCode?: string;
  transcribeCode?: LanguageCode;
}

const languages: Language[] = [
  { label: '英語', translateCode: 'en', transcribeCode: 'en-US' },
  { label: '日本語', translateCode: 'ja', transcribeCode: 'ja-JP' },
  { label: '中国語', translateCode: 'zh', transcribeCode: 'zh-CN' },
  { label: '韓国語', translateCode: 'ko', transcribeCode: 'ko-KR' },
  { label: 'フランス語', translateCode: 'fr', transcribeCode: 'fr-FR' },
  { label: 'ドイツ語', translateCode: 'de', transcribeCode: 'de-DE' },
];


type StateType = {
  sourceLanguage: Language;
  setSourceLanguage: (label: string, transcribeCode: LanguageCode) => void;
  destLanguage: Language;
  setDestLanguage: (label: string, translateCode: string) => void;
};

const useTranslatePageState = create<StateType>((set) => {
  const INIT_STATE = {
    sourceLanguage: languages[0],
    destLanguage: languages[1],
  };
  return {
    ...INIT_STATE,
    setSourceLanguage: (label: string, transcribeCode: LanguageCode) => {
      set(() => ({
        sourceLanguage: {
          label,
          transcribeCode
        },
      }));
    },
    setDestLanguage: (label: string, translateCode: string) => {
      set(() => ({
        destLanguage: {
          label,
          translateCode,
        },
      }));
    },
  };
});

const RealtimeTranslatePage: React.FC = () => {
  const { state } = useLocation();
  const { startTranscription, stopTranscription, transcripts, recording, clearTranscripts } =
  useSpeech2Text();
  const { translated, startTranslate, clearTranslate } = useSpeech2Text();
  const { scrollToBottom, scrollToTop } = useScroll();


  const {
    sourceLanguage,
    setSourceLanguage,
    destLanguage,
    setDestLanguage,
  } = useTranslatePageState();
  
  const transcriptsRef = useRef(transcripts); 

  useEffect(() => {
    // 要素が追加された時の処理
    const added = transcripts.filter(item => !transcriptsRef.current.includes(item));
    // 追加要素のみ出力
    added.forEach((item) => {
      startTranslate(item, destLanguage.translateCode || 'en')
    });
    transcriptsRef.current = transcripts;
  }, [destLanguage.translateCode, startTranslate, transcripts]);

  useEffect(() => {
    if (state !== null) {
      setDestLanguage(state.destLanguage.label || languages[0].label,
      state.destLanguage.translateCode || languages[0].translateCode
    )}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (transcripts.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcripts]);

  const clear = async () => {
    clearTranslate()
    clearTranscripts()
  }

  const _startTranscription = () => {
    startTranscription(sourceLanguage.transcribeCode || 'en-US')
  }

  const exportHistory = () => {
    const transcriptsText = transcripts.map(t => t.transcript).join('\n'); 
    const translatedText = translated.map(t => t.translated).join('\n'); 
    const blob = new Blob([transcriptsText,'\n\n', translatedText], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'history.txt'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
        通訳(Speech to Text)
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="言語選択">
          <div className="flex w-full flex-col lg:flex-row">
            <div className="w-full lg:ml-2 lg:w-1/2">
              <MenuDropdown
                menu={
                  <div className="flex items-center py-2">
                    入力言語: {sourceLanguage.label}
                    <PiCaretDown></PiCaretDown>
                  </div>
                }>
                {languages.map((language) => (
                  <MenuItem
                    key={language.label}
                    onClick={() => setSourceLanguage(
                      language.label,
                      language.transcribeCode!
                    )}>
                    {language.label}
                  </MenuItem>
                ))}
              </MenuDropdown>
            </div>
            <div className="w-full lg:ml-2 lg:w-1/2">
              <MenuDropdown
                menu={
                  <div className="flex items-center py-2">
                    出力言語: {destLanguage.label}
                    <PiCaretDown></PiCaretDown>
                  </div>
                }>
                {languages.map((language) => (
                  <MenuItem
                    key={language.label}
                    onClick={() => setDestLanguage(
                      language.label,
                      language.translateCode!
                    )}>
                    {language.label}
                  </MenuItem>
                ))}
              </MenuDropdown>
            </div>
          </div>
        </Card>
        <Card>
          <ul>
            {transcripts.map((t, i) => (
              <Card key={`${i}`} className="mb-12">
                <div>{t.transcript}</div>
                <div>{translated[i]?.translated}</div> 
              </Card>
            ))}
          </ul>
        </Card>
        <div className="bottom-0 z-0 flex justify-end gap-3">
          <Card>
            <div className="flex justify-end gap-3">
              <Button onClick={_startTranscription} disabled={recording}>
                Start Transcribe
              </Button>
              <Button onClick={stopTranscription} disabled={!recording}>
                Stop Transcribe
              </Button>
              <Button onClick={clear}>
                Clear
              </Button>
              <Button onClick={exportHistory}>
                Export
              </Button>
            </div>
            
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTranslatePage;
