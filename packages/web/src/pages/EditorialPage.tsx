import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import ExpandedField from '../components/ExpandedField';
import useChat from '../hooks/useChat';
import { create } from 'zustand';
import Texteditor from '../components/TextEditor';
import { DocumentComment } from 'generative-ai-use-cases-jp';
import debounce from 'lodash.debounce';
import { editorialPrompt } from '../prompts';
import { I18n } from 'aws-amplify';


const REGEX_BRACKET = /\{(?:[^{}])*\}/g;
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
  const { loading, messages, postChat, clear: clearChat } = useChat(pathname);

  // Memo 変数
  // Memo variables
  const filterComment = (
    _comments: DocumentComment[],
    _commentState: { [name: string]: boolean }
  ) => {
    return _comments.filter(
      (x) =>
        x.excerpt &&
        _commentState[x.excerpt] === undefined &&
        x.excerpt !== x.replace
    );
  };
  const shownComment = useMemo(
    () => filterComment(comments, commentState),
    [comments, commentState]
  );
  const disabledExec = useMemo(() => {
    return sentence === '' || loading;
  }, [sentence, loading]);

  useEffect(() => {
    if (state !== null) {
      setSentence(state.sentence);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 文章の更新時にコメントを更新
  // Update comments when text is updated
  useEffect(() => {
    // Claude だと全角を半角に変換して出力するため入力を先に正規化
    // If it's Claude, convert full-width to half-width and output, the input is normalized first
    if (sentence !== '') {
      setSentence(
        sentence
          .replace(REGEX_ZENKAKU, (s) => {
            return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
          })
          .replace(/[‐－―]/g, '-') // ハイフンなど | hyphens, etc.
          .replace(/[～〜]/g, '~') // チルダ | tilde
          // eslint-disable-next-line no-irregular-whitespace
          .replace(/　/g, ' ') // スペース | spaces
      );
    }

    // debounce した後コメント更新
    // Comment updated after debounce
    onSentenceChange(
      sentence,
      additionalContext,
      comments,
      commentState,
      loading
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence]);

  // debounce した後コメントを更新
  // Update comment after debounce
  // 入力を止めて1秒ほど待ってからコメントを更新し新規コメント追加リクエストを送信
  // Stop typing, wait about 1 second, update your comment, and submit a request to add a new comment
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSentenceChange = useCallback(
    debounce(
      (
        _sentence: string,
        _additionalContext: string,
        _comments: DocumentComment[],
        _commentState: { [name: string]: boolean },
        _loading: boolean
      ) => {
        // ハイライト部分が変更されたらコメントを削除
        // Delete comments when highlights are changed
        for (const _comment of _comments) {
          if (_sentence.indexOf(_comment.excerpt) === -1) {
            _commentState[_comment.excerpt] = true;
          }
        }
        setCommentState({ ..._commentState });

        // コメントがなくなったらコメントを取得
        // Get comments when there are no more comments (might need better translation)
        const _shownComment = filterComment(_comments, _commentState);
        if (_shownComment.length === 0 && _sentence !== '' && !_loading) {
          getAnnotation(_sentence, _additionalContext);
        }
      },
      1000
    ),
    []
  );

  // コメントの更新時にリアルタイムで JSON 部分を抽出してコメントに変換
  // Extract the JSON part and convert it into a comment in real time when a comment is updated
  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    const _comments = [..._response.matchAll(REGEX_BRACKET)].map((x) => {
      try {
        return JSON.parse(x[0]) as DocumentComment;
      } catch (error) {
        console.log(error);
        return { excerpt: '' };
      }
    });
    setComments(_comments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, commentState]);

  // コメントで指定された修正を実行
  // Execute the modifications specified in the comments
  const replaceSentence = (_comment: DocumentComment) => {
    if (_comment.replace) {
      setSentence(sentence.replace(_comment.excerpt, _comment.replace));
    }
    removeComment(_comment);
  };

  // コメントを削除
  // delete comment
  const removeComment = (_comment: DocumentComment) => {
    commentState[_comment.excerpt] = true;
    setCommentState({ ...commentState });
  };

  // LLM にリクエスト送信
  // send request to LLM
  const getAnnotation = (sentence: string, context: string) => {
    setCommentState({});
    postChat(
      editorialPrompt({
        sentence,
        context: context === '' ? undefined : context,
      }),
      true
    );
  };

  // コメントを取得
  // get comments
  const onClickExec = useCallback(() => {
    if (loading) return;
    getAnnotation(sentence, additionalContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, additionalContext, loading]);

  // リセット
  // resetting
  const onClickClear = useCallback(() => {
    clear();
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
        {I18n.get("editor")}
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label={I18n.get("editor")}>
          <Texteditor
            placeholder={I18n.get("please_enter")}
            value={sentence}
            loading={loading}
            onChange={setSentence}
            comments={shownComment}
            replaceSentence={replaceSentence}
            removeComment={removeComment}
          />

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
              {I18n.get("executions")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditorialPage;
