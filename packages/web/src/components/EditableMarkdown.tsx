import React, { useState } from 'react';
import { PiPencilLine, PiCheck } from 'react-icons/pi';
import Markdown from './Markdown';
import MDEditor from '@uiw/react-md-editor';
import Button from './Button';
import { Link } from 'react-router-dom';

interface EditableMarkdownProps {
  code: string;
  handleMarkdownChange: (markdown: string) => void;
}

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
  code,
  handleMarkdownChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    handleMarkdownChange(editedCode);
    setIsEditing(false);
  };

  return (
    <div className="relative">
      {isEditing ? (
        <div>
          <div data-color-mode="dark">
            <MDEditor
              value={editedCode}
              onChange={(newValue) => setEditedCode(newValue || '')}
              hideToolbar={true}
              preview="edit"
              height="100%"
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button onClick={handleSaveClick} disabled={editedCode === ''}>
              <PiCheck />
              保存
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Markdown>{['```mermaid', editedCode, '```'].join('\n')}</Markdown>
          <div className="mt-2 flex justify-end">
            <Button onClick={handleEditClick} outlined>
              <PiPencilLine />
              マークダウン編集
            </Button>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        Mermaid の記法は
        <Link
          className="text-aws-smile underline"
          to="https://mermaid.js.org/intro/"
          target="_blank">
          こちら
        </Link>
      </div>
    </div>
  );
};

export default EditableMarkdown;
