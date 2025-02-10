'use client';

import './writer.css';
import 'katex/dist/katex.min.css';

import { defaultEditorContent } from './lib/content';
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  // handleImageDrop,
  // handleImagePaste,
} from 'novel';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from './extensions';
import { ColorSelector } from './selectors/color-selector';
import { LinkSelector } from './selectors/link-selector';
import { NodeSelector } from './selectors/node-selector';
import { Separator } from './ui/separator';

import GenerativeMenuSwitch from './generative/generative-menu-switch';
// import { uploadFn } from './image-upload';
import { TextButtons } from './selectors/text-buttons';
import { slashCommand, suggestionItems } from './slash-command';

import hljs from 'highlight.js/lib/core';
import Card from '../Card';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import { PiTrash, PiChatText, PiSpinner } from 'react-icons/pi';
import useWriter from '../../hooks/useWriter';
import { Editor } from '@tiptap/react';
import Select from '../Select';
import { MODELS } from '../../hooks/useModel';
import { AICommentManager, useComments } from './extensions/ai-comments';
import ButtonCopy from '../ButtonCopy';
import DiffMatchPatch from 'diff-match-patch';
import { DocumentComment } from 'generative-ai-use-cases-jp';

const extensions = [...defaultExtensions, slashCommand];

interface Props {
  initialSentence?: string; // URLパラメータからの初期値用のみ残す
}

interface CommentItemProps {
  comment: DocumentComment;
  onReplace: () => void;
  onRemove: () => void;
  onClick: () => void;
  style?: React.CSSProperties;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReplace,
  onRemove,
  onClick,
}) => {
  // コンポーネント内で差分計算用の関数を追加
  const getCharacterDiff = (oldText: string, newText: string) => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map(([type, text], i) => {
      if (type === -1) {
        return (
          <span
            key={i}
            className="bg-red-100 text-red-600 line-through dark:bg-red-950/30 dark:text-red-400">
            {text}
          </span>
        );
      }
      if (type === 1) {
        return (
          <span
            key={i}
            className="bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400">
            {text}
          </span>
        );
      }
      return <span key={i}>{text}</span>;
    });
  };

  return (
    <Card className="mb-2">
      <div className="mb-5" onClick={onClick}>
        <div className="flex flex-col gap-2 rounded p-2">
          {comment.replace ? (
            <div>{getCharacterDiff(comment.excerpt, comment.replace)}</div>
          ) : (
            <div className="bg-red-100 text-red-600 line-through dark:bg-red-950/30 dark:text-red-400">
              {comment.excerpt}
            </div>
          )}
          {comment.replace && (
            <Button onClick={onReplace} className="ml-auto">
              置換
            </Button>
          )}
        </div>
      </div>
      <div className="mb-2 text-sm">{comment.comment}</div>
      <ButtonIcon onClick={onRemove}>
        <PiTrash />
      </ButtonIcon>
    </Card>
  );
};

const TailwindAdvancedEditor: React.FC<Props> = ({ initialSentence }) => {
  const { write, modelId, setModelId } = useWriter();
  const { modelIds: availableModels } = MODELS;
  const [commentManager, setCommentManager] = useState<AICommentManager | null>(
    null
  );
  const [initialContent, setInitialContent] = useState<null | JSONContent>(
    null
  );
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const { comments, commentState, filteredComments, loading } = useComments();
  const [commentPosition, setCommentPosition] = useState<number[]>([]);

  const [editorRef, setEditorRef] = useState<Editor | null>(null);
  const commentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // エディターの初期化時にコメントマネージャーを設定
  const handleEditorCreated = useCallback(
    (editor: Editor) => {
      setEditorRef(editor);
      setCommentManager(new AICommentManager(editor, write));
    },
    [write]
  );

  // Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      // @ts-expect-error https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  // コメントの位置を再計算する関数
  const recalculateCommentPositions = useCallback(() => {
    if (!editorRef || !commentManager) return;

    const positions = comments.map((comment) => {
      const matches = commentManager.findTextPosition(comment.excerpt);
      if (matches.length === 0) return 0;

      const { from } = matches[0];
      const coords = editorRef.view.coordsAtPos(from);
      const editorRect = editorRef.view.dom.getBoundingClientRect();

      return coords.top - editorRect.top;
    });

    setCommentPosition(positions);
  }, [commentManager, editorRef, comments]);

  // エディタの更新時にコメントの位置を再計算
  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      setCharsCount(editor.storage.characterCount.characters());
      window.localStorage.setItem(
        'html-content',
        highlightCodeblocks(editor.getHTML())
      );
      window.localStorage.setItem(
        'novel-content',
        JSON.stringify(editor.getJSON())
      );
      window.localStorage.setItem(
        'markdown',
        editor.storage.markdown.getMarkdown()
      );
      setSaveStatus('Saved');
      setText(editor.getText());
      setHtml(editor.getHTML());
    },
    500
  );

  // コメントが更新されたときに位置を再計算
  useEffect(() => {
    recalculateCommentPositions();
  }, [comments, recalculateCommentPositions]);

  // 初期コンテンツを設定
  useEffect(() => {
    const storedContent = window.localStorage.getItem('novel-content');
    const content = initialSentence
      ? {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: initialSentence }],
            },
          ],
        }
      : storedContent
        ? JSON.parse(storedContent)
        : defaultEditorContent;
    setInitialContent(content);
  }, [initialSentence]);

  // 校正ボタンのクリックハンドラ
  const handleExecClick = async () => {
    if (!commentManager) return;
    await commentManager.execAnnotation();
  };

  // コメントの実際の高さを取得
  const getCommentHeight = useCallback((idx: number) => {
    const ref = commentRefs.current[idx];
    if (!ref) return 0;
    const height = ref.getBoundingClientRect().height;
    return height + 16; // margin-bottom の 16px を加算
  }, []);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-end gap-2 text-sm">
          <div className="bg-accent text-muted-foreground rounded-lg px-2 py-1">
            ローカルモード: {saveStatus}
          </div>
          {charsCount && (
            <div className="bg-accent text-muted-foreground rounded-lg px-2 py-1">
              {charsCount} 文字
            </div>
          )}
          <ButtonCopy text={text} html={html} className="hover:bg-accent/80" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => ({
              value: m,
              label: m,
            }))}
            className="w-48"
          />
          <Button
            onClick={handleExecClick}
            disabled={loading}
            className="mb-3 flex items-center gap-2 text-sm">
            {loading ? (
              <PiSpinner className="h-4 w-4 animate-spin" />
            ) : (
              <PiChatText className="h-4 w-4" />
            )}
            校正
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="relative grow">
          <EditorRoot>
            <EditorContent
              initialContent={initialContent}
              extensions={extensions}
              className="border-muted bg-background relative min-h-[500px] w-full max-w-screen-lg sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
              editorProps={{
                handleDOMEvents: {
                  keydown: (_view, event) => handleCommandNavigation(event),
                },
                // handlePaste: (view, event) =>
                //   handleImagePaste(view, event, uploadFn),
                // handleDrop: (view, event, _slice, moved) =>
                //   handleImageDrop(view, event, moved, uploadFn),
                attributes: {
                  class:
                    'prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full',
                },
              }}
              onUpdate={({ editor }) => {
                debouncedUpdates(editor);
                setSaveStatus('Unsaved');
              }}
              onCreate={(props) => {
                handleEditorCreated(props.editor);
              }}
              slotAfter={<ImageResizer />}>
              <EditorCommand className="border-muted bg-background z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md transition-all">
                <EditorCommandEmpty className="text-muted-foreground px-2">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  {suggestionItems.map((item) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command?.(val)}
                      className="hover:bg-accent aria-selected:bg-accent flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm"
                      key={item.title}>
                      <div className="border-muted bg-background flex h-10 w-10 items-center justify-center rounded-md border">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.description}
                        </p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>

              <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
                <Separator orientation="vertical" />
                <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                <Separator orientation="vertical" />

                <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                <Separator orientation="vertical" />
                <Separator orientation="vertical" />
                <TextButtons />
                <Separator orientation="vertical" />
                <ColorSelector open={openColor} onOpenChange={setOpenColor} />
              </GenerativeMenuSwitch>
            </EditorContent>
          </EditorRoot>
        </div>

        {commentManager && filteredComments.length > 0 && (
          <div className="w-80 min-w-80 lg:ml-2">
            {!loading && commentManager && filteredComments.length === 0 && (
              <div className="mb-2 ml-2">指摘事項はありません</div>
            )}
            {loading && (
              <div className="mb-2 ml-2 flex justify-center">
                <div className="border-aws-sky size-10 animate-spin rounded-full border-4 border-t-transparent"></div>
              </div>
            )}

            {commentManager &&
              comments.map((comment, idx) => {
                if (commentState[comment.excerpt]) return null;

                const position = commentPosition[idx];

                // 前の表示されているコメントのインデックスを探す
                let prevDisplayedIndex = idx - 1;
                while (
                  prevDisplayedIndex >= 0 &&
                  commentState[comments[prevDisplayedIndex].excerpt]
                ) {
                  prevDisplayedIndex--;
                }

                const prevPosition =
                  prevDisplayedIndex >= 0
                    ? commentPosition[prevDisplayedIndex]
                    : null;
                const prevHeight =
                  prevDisplayedIndex >= 0
                    ? getCommentHeight(prevDisplayedIndex)
                    : 0;

                // 前のコメントとの間隔を計算
                const spacerHeight =
                  position && prevPosition
                    ? Math.max(0, position - (prevPosition + prevHeight))
                    : position
                      ? position
                      : 0;

                return (
                  <div key={`${comment.excerpt}-${idx}`}>
                    {spacerHeight > 0 && (
                      <div style={{ height: spacerHeight }} />
                    )}
                    <div ref={(el) => (commentRefs.current[idx] = el)}>
                      <CommentItem
                        comment={comment}
                        onReplace={() => {
                          commentManager.replaceSentence(comment);
                        }}
                        onRemove={() => {
                          commentManager.removeComment(comment);
                        }}
                        onClick={() => commentManager.focusComment(comment)}
                      />
                    </div>
                  </div>
                );
              })}

            {commentManager && filteredComments.length > 0 && !loading && (
              <div className="mt-4 flex justify-end gap-3">
                <Button outlined onClick={() => commentManager.clearComments()}>
                  クリア
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TailwindAdvancedEditor;
