import { Button } from '../ui/button';
import { cn } from '../lib/utils';
import { PiSigma } from 'react-icons/pi';
import { useEditor } from 'novel';

export const MathSelector = () => {
  const { editor } = useEditor();

  if (!editor) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-12 rounded-none"
      onClick={() => {
        if (editor.isActive('math')) {
          editor.chain().focus().unsetLatex().run();
        } else {
          const { from, to } = editor.state.selection;
          const latex = editor.state.doc.textBetween(from, to);

          if (!latex) return;

          editor.chain().focus().setLatex({ latex }).run();
        }
      }}>
      <PiSigma
        className={cn('size-4', { 'text-blue-500': editor.isActive('math') })}
        strokeWidth={2.3}
      />
    </Button>
  );
};
