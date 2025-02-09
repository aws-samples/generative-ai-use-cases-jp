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
  handleImageDrop,
  handleImagePaste,
} from 'novel';
import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from './extensions';
import { ColorSelector } from './selectors/color-selector';
import { LinkSelector } from './selectors/link-selector';
import { MathSelector } from './selectors/math-selector';
import { NodeSelector } from './selectors/node-selector';
import { Separator } from './ui/separator';

import GenerativeMenuSwitch from './generative/generative-menu-switch';
import { uploadFn } from './image-upload';
import { TextButtons } from './selectors/text-buttons';
import { slashCommand, suggestionItems } from './slash-command';

import hljs from 'highlight.js/lib/core';
import Card from '../Card';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import { PiTrash, PiChatText } from 'react-icons/pi';
import useWriter from '../../hooks/useWriter';
import { Editor } from '@tiptap/react';
import Select from '../Select';
import { MODELS } from '../../hooks/useModel';
import { AICommentManager, useComments } from './extensions/ai-comments';

const extensions = [...defaultExtensions, slashCommand];

interface Props {
  initialSentence?: string; // URLパラメータからの初期値用のみ残す
}

const TailwindAdvancedEditor: React.FC<Props> = ({ initialSentence }) => {
  const { write, modelId, setModelId } = useWriter();
  const { modelIds: availableModels } = MODELS;
  const [commentManager, setCommentManager] = useState<AICommentManager | null>(null);
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const { filteredComments, loading } = useComments();

  // エディターの初期化時にコメントマネージャーを設定
  const handleEditorCreated = useCallback((editor: Editor) => {
    setCommentManager(new AICommentManager(editor, write));
  }, [write]);

  // Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      // @ts-expect-error https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  // テキストの更新時にローカルストレージに保存
  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      setCharsCount(editor.storage.characterCount.words());
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
    },
    500
  );

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
      : (storedContent ? JSON.parse(storedContent) : defaultEditorContent);
    setInitialContent(content);
  }, [initialSentence]);

  // 校正ボタンのクリックハンドラ
  const handleExecClick = async () => {
    if (!commentManager) return;
    await commentManager.execAnnotation();
  };

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
              {charsCount} Words
            </div>
          )}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
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
            className="flex items-center gap-2 text-sm mb-3">
            <PiChatText className="h-4 w-4" />
            校正
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        <EditorRoot>
          <EditorContent
            initialContent={initialContent}
            extensions={extensions}
            className="border-muted bg-background relative min-h-[500px] w-full max-w-screen-lg sm:rounded-lg sm:border sm:shadow-lg"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view, event) => handleCommandNavigation(event),
              },
              handlePaste: (view, event) =>
                handleImagePaste(view, event, uploadFn),
              handleDrop: (view, event, _slice, moved) =>
                handleImageDrop(view, event, moved, uploadFn),
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
              <MathSelector />
              <Separator orientation="vertical" />
              <TextButtons />
              <Separator orientation="vertical" />
              <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            </GenerativeMenuSwitch>
          </EditorContent>
        </EditorRoot>

        <div className="mb-2 rounded p-1.5 outline-none lg:ml-2 min-w-80">
          {commentManager && filteredComments.map((comment, idx) => (
            <Card key={`${comment.excerpt}-${idx}`} className="mb-2">
              <div className="mb-5">
                <span className="line-through">{comment.excerpt}</span>
                {comment.replace && (
                  <>
                    <span className="mx-2">→</span>
                    <Button onClick={() => commentManager.replaceSentence(comment)}>
                      {comment.replace}
                    </Button>
                  </>
                )}
              </div>

              <div className="mb-2 text-sm">{comment.comment}</div>
              <ButtonIcon onClick={() => commentManager.removeComment(comment)}>
                <PiTrash />
              </ButtonIcon>
            </Card>
          ))}
          {!loading && commentManager && filteredComments.length === 0 && (
            <div className="mb-2 ml-2">指摘事項はありません</div>
          )}
          {loading && (
            <div className="mb-2 ml-2 flex justify-center">
              <div className="border-aws-sky size-10 animate-spin rounded-full border-4 border-t-transparent"></div>
            </div>
          )}

          {commentManager && filteredComments.length > 0 && !loading && (
            <div className="flex justify-end gap-3">
              <Button outlined onClick={() => commentManager.clearComments()}>
                クリア
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TailwindAdvancedEditor;
