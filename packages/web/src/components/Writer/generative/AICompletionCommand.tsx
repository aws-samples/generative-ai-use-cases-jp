import { CommandGroup, CommandItem, CommandSeparator } from '../ui/Command';
import { useEditor } from 'novel';
import { PiCheck, PiQuotes, PiTrash } from 'react-icons/pi';

const AICompletionCommands = ({
  completion,
  onDiscard,
}: {
  completion: string;
  onDiscard: () => void;
}) => {
  const { editor } = useEditor();
  if (!editor) return null;
  return (
    <>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem
          className="gap-2 px-4"
          value="replace"
          onSelect={() => {
            const selection = editor.view.state.selection;

            editor
              .chain()
              .focus()
              .insertContentAt(
                {
                  from: selection.from,
                  to: selection.to,
                },
                completion
              )
              .run();
          }}>
          <PiCheck className="text-muted-foreground h-4 w-4" />
          選択範囲を置換
        </CommandItem>
        <CommandItem
          className="gap-2 px-4"
          value="insert"
          onSelect={() => {
            const selection = editor.view.state.selection;
            editor
              .chain()
              .focus()
              .insertContentAt(selection.to + 1, completion)
              .run();
          }}>
          <PiQuotes className="text-muted-foreground h-4 w-4" />
          選択範囲の下に挿入
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />

      <CommandGroup>
        <CommandItem onSelect={onDiscard} value="thrash" className="gap-2 px-4">
          <PiTrash className="text-muted-foreground h-4 w-4" />
          破棄
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AICompletionCommands;
