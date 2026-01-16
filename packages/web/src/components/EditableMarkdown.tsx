import React, { useState } from 'react';
import { PiPencilLine, PiCheck } from 'react-icons/pi';
import Markdown from './Markdown';
import MDEditor from '@uiw/react-md-editor';
import Button from './Button';
import { Trans, useTranslation } from 'react-i18next';

interface EditableMarkdownProps {
  code: string;
  handleMarkdownChange: (markdown: string) => void;
}

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
  code,
  handleMarkdownChange,
}) => {
  const { t } = useTranslation();
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
              {t('common.save')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Markdown>{['```mermaid', editedCode, '```'].join('\n')}</Markdown>
          <div className="mt-2 flex justify-end">
            <Button onClick={handleEditClick} outlined>
              <PiPencilLine />
              {t('diagram.markdown_edit')}
            </Button>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <Trans
          i18nKey="diagram.mermaid_syntax"
          components={[
            <a
              key="mermaid-link"
              className="text-aws-smile underline"
              href="https://mermaid.js.org/intro/"
              target="_blank"
              rel="noopener noreferrer"
            />,
          ]}
        />
      </div>
    </div>
  );
};

export default EditableMarkdown;
