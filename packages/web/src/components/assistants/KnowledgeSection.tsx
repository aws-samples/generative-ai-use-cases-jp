import React from 'react';
import { useTranslation } from 'react-i18next';
import { PiPlus, PiTrash, PiGlobe, PiFile } from 'react-icons/pi';
import { KnowledgeSource } from 'generative-ai-use-cases';
import Button from '../Button';
import InputText from '../InputText';
import FileUploader from '../FileUploader';

export type KnowledgeSectionProps = {
  ragEnabled: boolean;
  knowledgeSources: KnowledgeSource[];
  newUrl: string;
  uploadingFiles: boolean;
  onNewUrlChange: (url: string) => void;
  onAddUrl: () => void;
  onRemoveSource: (index: number) => void;
  onFileUpload: (files: FileList) => Promise<void>;
  onDeleteFile: (sourceId: string) => void;
  disabled?: boolean;
};

const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  ragEnabled,
  knowledgeSources,
  newUrl,
  uploadingFiles,
  onNewUrlChange,
  onAddUrl,
  onRemoveSource,
  onFileUpload,
  onDeleteFile,
  disabled = false,
}) => {
  const { t } = useTranslation();

  if (!ragEnabled) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          {t('assistant.edit.sourceUrls')}
        </label>
        {!disabled && (
          <div className="mb-2 flex gap-2">
            <InputText
              value={newUrl}
              onChange={onNewUrlChange}
              placeholder="https://example.com"
              className="flex-1"
              disabled={disabled}
            />
            <Button
              onClick={onAddUrl}
              outlined
              disabled={disabled}
              className="flex items-center gap-1">
              <PiPlus />
              {t('assistant.edit.add')}
            </Button>
          </div>
        )}
        <div className="space-y-1">
          {knowledgeSources
            .filter((ks) => ks.sourceType === 'url')
            .map((source) => {
              const actualIndex = knowledgeSources.indexOf(source);
              return (
                <div
                  key={actualIndex}
                  className="flex items-center gap-2 text-sm">
                  <PiGlobe className="text-gray-500" />
                  <span className="flex-1">
                    {source.sourceUrl || source.url || source.name}
                  </span>
                  {!disabled && (
                    <Button
                      outlined
                      className="text-sm"
                      onClick={() => onRemoveSource(actualIndex)}>
                      <PiTrash />
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          {t('assistant.edit.uploadFiles')}
        </label>
        {!disabled && (
          <>
            <FileUploader
              onFileSelect={onFileUpload}
              accept=".pdf,.txt,.doc,.docx,.md"
              multiple
            />
            {uploadingFiles && (
              <p className="mt-2 text-sm text-blue-600">
                {t('assistant.edit.uploadingFiles')}
              </p>
            )}
          </>
        )}
        <div className="mt-2 space-y-1">
          {knowledgeSources
            .filter((ks) => ks.sourceType === 'file' || ks.type === 'file')
            .map((source) => {
              return (
                <div
                  key={source.id}
                  className="flex items-center gap-2 text-sm">
                  <PiFile className="text-gray-500" />
                  <span className="flex-1">
                    {source.displayName || source.name}
                  </span>
                  {source.status && (
                    <span
                      className={`text-xs ${
                        source.status === 'SUCCEEDED'
                          ? 'text-green-600'
                          : source.status === 'FAILED'
                            ? 'text-red-600'
                            : source.status === 'SYNCING'
                              ? 'text-blue-600'
                              : 'text-gray-600'
                      }`}>
                      {source.status}
                    </span>
                  )}
                  {!disabled && (
                    <Button
                      outlined
                      className="text-sm"
                      onClick={() => onDeleteFile(source.id!)}>
                      <PiTrash />
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeSection;
