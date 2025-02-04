'use client';

import { Command, CommandInput } from '../ui/command';

// import { useCompletion } from "ai/react";
import { PiArrowUp } from 'react-icons/pi';
import { useEditor } from 'novel';
import { addAIHighlight } from 'novel';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import CrazySpinner from '../ui/icons/crazy-spinner';
import Magic from '../ui/icons/magic';
import { ScrollArea } from '../ui/scroll-area';
import AICompletionCommands from './ai-completion-command';
import AISelectorCommands from './ai-selector-commands';
import useWriter from '../../../hooks/useWriter';
//TODO: I think it makes more sense to create a custom Tiptap extension for this functionality https://tiptap.dev/docs/editor/ai/introduction

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState('');
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { write } = useWriter();

  const complete = async (
    text: string,
    options: { body: { option: string; command: string } }
  ) => {
    try {
      setIsLoading(true);
      setCompletion('');

      const stream = write(text, options.body.option, options.body.command);

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        fullResponse = fullResponse.replace('</output>', '');
        setCompletion(fullResponse);
      }
    } catch (e: unknown) {
      toast.error(
        typeof e === 'object' && e && 'message' in e
          ? (e.message as string)
          : 'エラーが発生しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const hasCompletion = completion.length > 0;
  if (!editor) return null;

  return (
    <Command className="w-[350px]">
      {hasCompletion && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose prose-sm p-2 px-4">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-purple-500">
          <Magic className="mr-2 h-4 w-4 shrink-0  " />
          AI is thinking
          <div className="ml-2 mt-1">
            <CrazySpinner />
          </div>
        </div>
      )}
      {!isLoading && (
        <>
          <div className="relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={
                hasCompletion
                  ? 'Tell AI what to do next'
                  : 'Ask AI to edit or generate...'
              }
              onFocus={() => addAIHighlight(editor)}
            />
            <Button
              size="icon"
              className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
              onClick={() => {
                if (completion)
                  return complete(completion, {
                    body: { option: 'zap', command: inputValue },
                  }).then(() => setInputValue(''));

                const slice = editor.state.selection.content();
                const text = editor.storage.markdown.serializer.serialize(
                  slice.content
                );

                complete(text, {
                  body: { option: 'zap', command: inputValue },
                }).then(() => setInputValue(''));
              }}>
              <PiArrowUp className="h-4 w-4" />
            </Button>
          </div>
          {hasCompletion ? (
            <AICompletionCommands
              onDiscard={() => {
                editor.chain().unsetHighlight().focus().run();
                onOpenChange(false);
              }}
              completion={completion}
            />
          ) : (
            <AISelectorCommands
              onSelect={(value, option) =>
                complete(value, { body: { option, command: inputValue } })
              }
            />
          )}
        </>
      )}
    </Command>
  );
}
