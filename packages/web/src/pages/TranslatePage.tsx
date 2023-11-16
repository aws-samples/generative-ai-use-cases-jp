import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import ExpandedField from '../components/ExpandedField';
import MenuDropdown from '../components/MenuDropdown';
import MenuItem from '../components/MenuItem';
import Markdown from '../components/Markdown';
import ButtonCopy from '../components/ButtonCopy';
import useChat from '../hooks/useChat';
import { create } from 'zustand';
import debounce from 'lodash.debounce';
import { PiCaretDown } from 'react-icons/pi';
import { translatePrompt } from '../prompts';
import { I18n } from 'aws-amplify';


const languages = [
  { label: I18n.get("english")},
  { label: I18n.get("japanese")},
  { label: I18n.get("chinese")},
  { label: I18n.get("korean")},
  { label: I18n.get("french")},
  { label: I18n.get("spanish")},
  { label: I18n.get("german")},
];

type StateType = {
  sentence: string;
  setSentence: (s: string) => void;
  additionalContext: string;
  setAdditionalContext: (s: string) => void;
  language: string;
  setLanguage: (s: string) => void;
  translatedSentence: string;
  setTranslatedSentence: (s: string) => void;
  clear: () => void;
};

const useTranslatePageState = create<StateType>((set) => {
  const INIT_STATE = {
    sentence: '',
    additionalContext: '',
    language: languages[0].label,
    translatedSentence: '',
  };
  return {
    ...INIT_STATE,
    setSentence: (s: string) => {
      set(() => ({
        sentence: s,
      }));
    },
    setAdditionalContext: (s: string) => {
      set(() => ({
        additionalContext: s,
      }));
    },
    setLanguage: (s: string) => {
      set(() => ({
        language: s,
      }));
    },
    setTranslatedSentence: (s: string) => {
      set(() => ({
        translatedSentence: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const TranslatePage: React.FC = () => {
  const {
    sentence,
    setSentence,
    additionalContext,
    setAdditionalContext,
    language,
    setLanguage,
    translatedSentence,
    setTranslatedSentence,
    clear,
  } = useTranslatePageState();

  const { state } = useLocation();
  const { pathname } = useLocation();
  const { loading, messages, postChat, clear: clearChat } = useChat(pathname);

  // Memo 変数
  // Memo variables
  const disabledExec = useMemo(() => {
    return sentence === '' || loading;
  }, [sentence, loading]);

  useEffect(() => {
    if (state !== null) {
      setSentence(state.sentence);
      setAdditionalContext(state.additionalContext);
      setLanguage(state.language || languages[0].label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 文章の更新時にコメントを更新
  // update comments when text is updated
  useEffect(() => {
    // debounce した後翻訳
    // translate after debounce
    onSentenceChange(sentence, additionalContext, language, loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, language]);

  // debounce した後翻訳
  // translate after debounce
  // 入力を止めて1秒ほど待ってから翻訳リクエストを送信
  // Stop typing and wait about 1 second before submitting the translation request
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSentenceChange = useCallback(
    debounce(
      (
        _sentence: string,
        _additionalContext: string,
        _language: string,
        _loading: boolean
      ) => {
        if (_sentence === '') {
          setTranslatedSentence('');
        }
        if (_sentence !== '' && !_loading) {
          getTranslation(_sentence, _language, _additionalContext);
        }
      },
      1000
    ),
    []
  );

  // リアルタイムにレスポンスを表示
  // display responses in real time
  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setTranslatedSentence(
      _response.replace(/(<output>|<\/output>)/g, '').trim()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // LLM にリクエスト送信
  const getTranslation = (
    sentence: string,
    language: string,
    context: string
  ) => {
    postChat(
      translatePrompt({
        sentence,
        language,
        context: context === '' ? undefined : context,
      }),
      true
    );
  };

  // 翻訳を実行
  // execute translation
  const onClickExec = useCallback(() => {
    if (loading) return;
    getTranslation(sentence, language, additionalContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, additionalContext, loading]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
        {I18n.get("translation")}
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label={I18n.get("translation_sentences")}>
          <div className="flex w-full flex-col lg:flex-row">
            <div className="w-full lg:w-1/2">
              <div className="py-3">{I18n.get("translation_autodetect")}</div>
              <Textarea
                placeholder={I18n.get("please_enter")}
                value={sentence}
                onChange={setSentence}
                maxHeight={-1}
              />
            </div>
            <div className="w-full lg:ml-2 lg:w-1/2">
              <MenuDropdown
                menu={
                  <div className="flex items-center py-2">
                    {language}
                    <PiCaretDown></PiCaretDown>
                  </div>
                }>
                {languages.map((language) => (
                  <MenuItem
                    key={language.label}
                    onClick={() => setLanguage(language.label)}>
                    {language.label}
                  </MenuItem>
                ))}
              </MenuDropdown>
              <div className="rounded border border-black/30 p-1.5">
                <Markdown>{translatedSentence}</Markdown>
                {loading && (
                  <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                )}
                <div className="flex w-full justify-end">
                  <ButtonCopy text={translatedSentence}></ButtonCopy>
                </div>
              </div>
            </div>
          </div>

          <ExpandedField label={I18n.get("additional_context")} optional>
            <Textarea
              placeholder={I18n.get("additional_context_placeholder")}
              value={additionalContext}
              onChange={setAdditionalContext}
            />
          </ExpandedField>

          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear} disabled={disabledExec}>
                {I18n.get("clear")}
            </Button>

            <Button disabled={disabledExec} onClick={onClickExec}>
                  {I18n.get("execute")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TranslatePage;
