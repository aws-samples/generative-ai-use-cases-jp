import {
  PiEqualsThin,
  PiChecks,
  PiArrowClockwise,
  PiSkipForward,
  PiTextAlignJustify,
} from 'react-icons/pi';
import { getPrevText, useEditor } from 'novel';
import { CommandGroup, CommandItem, CommandSeparator } from '../ui/command';

const options = [
  {
    value: 'improve',
    label: '推敲',
    icon: PiArrowClockwise,
  },
  {
    value: 'fix',
    label: '校正',
    icon: PiChecks,
  },
  {
    value: 'shorter',
    label: '短くする',
    icon: PiEqualsThin,
  },
  {
    value: 'longer',
    label: '長くする',
    icon: PiTextAlignJustify,
  },
];

interface AISelectorCommandsProps {
  onSelect: (value: string, option: string) => void;
}

const AISelectorCommands = ({ onSelect }: AISelectorCommandsProps) => {
  const { editor } = useEditor();
  if (!editor) return null;
  return (
    <>
      <CommandGroup heading="Edit or review selection">
        {options.map((option) => (
          <CommandItem
            onSelect={(value: string) => {
              const slice = editor.state.selection.content();
              const text = editor.storage.markdown.serializer.serialize(
                slice.content
              );
              onSelect(text, value);
            }}
            className="flex gap-2 px-4"
            key={option.value}
            value={option.value}>
            <option.icon className="h-4 w-4 text-purple-500" />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Use AI to do more">
        <CommandItem
          onSelect={() => {
            const pos = editor.state.selection.from;
            const text = getPrevText(editor, pos);
            onSelect(text, 'continue');
          }}
          value="continue"
          className="gap-2 px-4">
          <PiSkipForward className="h-4 w-4 text-purple-500" />
          Continue writing
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AISelectorCommands;
