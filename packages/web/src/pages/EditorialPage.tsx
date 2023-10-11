import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import ExpandedField from '../components/ExpandedField';
import { EditorialPrompt } from '../prompts';
import useChat from '../hooks/useChat';
import { create } from 'zustand';
import Texteditor from '../components/TextEditor';
import { DocumentComment } from 'generative-ai-use-cases-jp';
import debounce from 'lodash.debounce';

const REGEX_JSON = /\{(?:[^{}])*\}/g;
const REGEX_ZENKAKU =
  /[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g;

type StateType = {
  sentence: string;
  setSentence: (s: string) => void;
  additionalContext: string;
  setAdditionalContext: (s: string) => void;
  comments: DocumentComment[];
  setComments: (comments: DocumentComment[]) => void;
  commentState: { [name: string]: boolean }; // excerpt -> bool
  setCommentState: (s: { [name: string]: boolean }) => void;
  clear: () => void;
};

const useEditorialPageState = create<StateType>((set) => {
  const INIT_STATE = {
    sentence: '',
    additionalContext: '',
    comments: [],
    commentState: {},
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
    setComments: (comments: DocumentComment[]) => {
      set(() => ({
        comments: comments,
      }));
    },
    setCommentState: (s: { [name: string]: boolean }) => {
      set(() => ({
        commentState: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const EditorialPage: React.FC = () => {
  const {
    sentence,
    setSentence,
    additionalContext,
    setAdditionalContext,
    comments,
    setComments,
    commentState,
    setCommentState,
    clear,
  } = useEditorialPageState();

  const { state } = useLocation();
  const { pathname } = useLocation();
  const { loading, messages, postChat } = useChat(
    pathname,
    EditorialPrompt.systemContext
  );

  // Memo 変数
  const shownComment = useMemo(() => {
    return comments.filter(
      (x) => x.excerpt !== '' && commentState[x.excerpt] === undefined
    );
  }, [comments, commentState]);
  const disabledExec = useMemo(() => {
    return sentence === '' || loading;
  }, [sentence, loading]);

  useEffect(() => {
    if (state !== null) {
      console.log(state);
      setSentence(state.sentence);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 文章の更新時にコメントを更新
  useEffect(() => {
    // Claude だと全角を半角に変換して出力するため入力を先に正規化
    setSentence(
      sentence
        .replace(REGEX_ZENKAKU, (s) => {
          return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
        })
        .replace(/[‐－―]/g, '-') // ハイフンなど
        .replace(/[～〜]/g, '~') // チルダ
        // eslint-disable-next-line no-irregular-whitespace
        .replace(/　/g, ' ') // スペース
    );

    // Debounce 後コメント更新
    onSentenceChange(sentence, comments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence]);

  // debounce した後コメントを更新
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSentenceChange = useCallback(
    debounce((sentence: string, comments: DocumentComment[]) => {
      // ハイライト部分が変更されたらコメントを削除
      for (const comment of comments) {
        if (sentence.indexOf(comment.excerpt) === -1) {
          commentState[comment.excerpt] = true;
        }
      }
      setCommentState({ ...commentState });
    }, 1000),
    []
  );

  useEffect(() => {
    // コメントがなくなったらコメントを取得
    if (shownComment.length === 0 && sentence !== '' && !loading) {
      getAnnotation(sentence, additionalContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownComment, sentence, loading]);

  // コメントの更新時にリアルタイムで JSON 部分を抽出してコメントに変換
  useEffect(() => {
    if (messages.length === 0 || messages.length % 2 === 1) return;
    const response = messages[messages.length - 1].content;
    const comments = [...response.matchAll(REGEX_JSON)].map((x) => {
      try {
        return JSON.parse(x[0]) as DocumentComment;
      } catch (error) {
        console.log(error);
        return { excerpt: '' };
      }
    });
    setComments(comments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, commentState]);

  // コメントで指定された修正を実行
  const replaceSentence = (comment: DocumentComment) => {
    if (comment.replace) {
      setSentence(sentence.replace(comment.excerpt, comment.replace));
    }
    removeComment(comment);
  };

  // コメントを削除
  const removeComment = (comment: DocumentComment) => {
    commentState[comment.excerpt] = true;
    setCommentState({ ...commentState });
  };

  // LLM にリクエスト送信
  const getAnnotation = (sentence: string, additionalContext: string) => {
    setCommentState({});
    postChat(
      EditorialPrompt.editorialContext(
        sentence,
        additionalContext === '' ? undefined : additionalContext
      ),
      true
    );
  };

  // コメントを取得
  const onClickExec = useCallback(() => {
    if (loading) return;
    getAnnotation(sentence, additionalContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, additionalContext, loading]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
        校正
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-8 xl:col-start-3">
        <Card label="校正したい文章">
          <Texteditor
            placeholder="入力してください"
            value={sentence}
            loading={loading}
            onChange={setSentence}
            comments={shownComment}
            replaceSentence={replaceSentence}
            removeComment={removeComment}
          />

          <ExpandedField label="追加コンテキスト" optional>
            <Textarea
              placeholder="追加で指摘してほしい点を入力することができます"
              value={additionalContext}
              onChange={setAdditionalContext}
            />
          </ExpandedField>

          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear} disabled={disabledExec}>
              クリア
            </Button>

            <Button disabled={disabledExec} onClick={onClickExec}>
              実行
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditorialPage;
