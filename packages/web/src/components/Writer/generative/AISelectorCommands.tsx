import {
  PiEqualsThin,
  PiChecks,
  PiArrowClockwise,
  PiSkipForward,
  PiTextAlignJustify,
  PiMagnifyingGlass,
  PiCheck,
  PiFileMagnifyingGlass,
} from 'react-icons/pi';
import { getPrevText, useEditor } from 'novel';
import { CommandGroup, CommandItem, CommandSeparator } from '../ui/Command';
import { MODELS } from '../../../hooks/useModel';

const options = [
  {
    value: 'improve',
    label: '推敲',
    icon: PiArrowClockwise,
  },
  {
    value: 'fix',
    label: '校閲',
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

const agentOptions = [
  {
    value: 'search',
    label: '検索して執筆...',
    icon: PiMagnifyingGlass,
  },
  {
    value: 'collectData',
    label: '裏付け・データを調査し追記',
    icon: PiFileMagnifyingGlass,
  },
  {
    value: 'factCheck',
    label: 'ファクトチェック',
    icon: PiCheck,
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
      <CommandSeparator />
      <CommandGroup heading="選択範囲を編集">
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

      {MODELS.searchAgent && (
        <>
          <CommandSeparator />
          <CommandGroup heading="検索エンジンを使う">
            {agentOptions.map((option) => (
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
        </>
      )}

      <CommandSeparator />
      <CommandGroup heading="生成">
        <CommandItem
          onSelect={() => {
            const pos = editor.state.selection.from;
            const text = getPrevText(editor, pos);
            onSelect(text, 'continue');
          }}
          value="continue"
          className="gap-2 px-4">
          <PiSkipForward className="h-4 w-4 text-purple-500" />
          続きを出力
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AISelectorCommands;
