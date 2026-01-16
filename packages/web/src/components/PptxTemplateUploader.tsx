import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiX, PiPresentation } from 'react-icons/pi';
import Button from './Button';
import ButtonIcon from './ButtonIcon';
import InputText from './InputText';
import Textarea from './Textarea';
import Switch from './Switch';
import FileUploader from './FileUploader';
import ModalDialog from './ModalDialog';
import { PptxTemplateInput } from '../@types/pptx';

interface PptxTemplateUploaderProps {
  onUpload: (file: File, templateData: PptxTemplateInput) => Promise<void>;
  onClose: () => void;
}

const PptxTemplateUploader: React.FC<PptxTemplateUploaderProps> = ({
  onUpload,
  onClose,
}) => {
  const { t } = useTranslation();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    (files: FileList) => {
      if (files.length > 0) {
        const selectedFile = files[0];

        // Validate file type
        if (
          !selectedFile.name.toLowerCase().endsWith('.pptx') &&
          !selectedFile.name.toLowerCase().endsWith('.potx')
        ) {
          setError(t('pptx.upload.invalidFileType'));
          return;
        }

        // Validate file size (max 50MB)
        if (selectedFile.size > 50 * 1024 * 1024) {
          setError(t('pptx.upload.fileTooLarge'));
          return;
        }

        setFile(selectedFile);
        setError(null);

        // Auto-fill template name from filename
        if (!templateName) {
          const nameWithoutExtension = selectedFile.name.replace(
            /\.[^/.]+$/,
            ''
          );
          setTemplateName(nameWithoutExtension);
        }
      }
    },
    [templateName, t]
  );

  const handleUpload = useCallback(async () => {
    if (!file || !templateName.trim()) {
      setError(t('pptx.upload.missingFields'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const templateData: PptxTemplateInput = {
        template_name: templateName.trim(),
        template_description: templateDescription.trim() || undefined,
        is_public: isPublic,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      await onUpload(file, templateData);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || t('pptx.upload.failed'));
      } else {
        setError(t('pptx.upload.failed'));
      }
    } finally {
      setIsUploading(false);
    }
  }, [
    file,
    templateName,
    templateDescription,
    isPublic,
    tags,
    onUpload,
    onClose,
    t,
  ]);

  const isValid = file && templateName.trim().length > 0;

  return (
    <ModalDialog
      isOpen={true}
      onClose={onClose}
      title={t('pptx.upload.title')}
      className="max-w-2xl">
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="text-aws-font-color mb-2 block text-sm font-medium">
            {t('pptx.upload.fileLabel')}
          </label>
          <FileUploader
            accept=".pptx,.potx"
            onFileSelect={handleFileSelect}
            className="w-full"
          />
          {file && (
            <div className="border-aws-border mt-3 flex items-center space-x-3 rounded-lg border p-3">
              <PiPresentation className="text-aws-smile h-8 w-8" />
              <div className="flex-1">
                <p className="text-aws-font-color text-sm font-medium">
                  {file.name}
                </p>
                <p className="text-aws-font-color-secondary text-xs">
                  {(file.size / (1024 * 1024)).toFixed(2)}{' '}
                  {t('common.unitMB')}
                </p>
              </div>
              <ButtonIcon onClick={() => setFile(null)} className="h-6 w-6">
                <PiX />
              </ButtonIcon>
            </div>
          )}
        </div>

        {/* Template Name */}
        <div>
          {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
          <label className="text-aws-font-color mb-2 block text-sm font-medium">
            {t('pptx.upload.nameLabel')} *
          </label>
          <InputText
            value={templateName}
            onChange={setTemplateName}
            placeholder={t('pptx.upload.namePlaceholder')}
          />
        </div>

        {/* Template Description */}
        <div>
          <label className="text-aws-font-color mb-2 block text-sm font-medium">
            {t('pptx.upload.descriptionLabel')}
          </label>
          <Textarea
            value={templateDescription}
            onChange={setTemplateDescription}
            placeholder={t('pptx.upload.descriptionPlaceholder')}
            rows={3}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-aws-font-color mb-2 block text-sm font-medium">
            {t('pptx.upload.tagsLabel')}
          </label>
          <InputText
            value={tags}
            onChange={setTags}
            placeholder={t('pptx.upload.tagsPlaceholder')}
          />
          <p className="text-aws-font-color-secondary mt-1 text-xs">
            {t('pptx.upload.tagsHelp')}
          </p>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-aws-font-color text-sm font-medium">
              {t('pptx.upload.publicLabel')}
            </label>
            <p className="text-aws-font-color-secondary text-xs">
              {t('pptx.upload.publicHelp')}
            </p>
          </div>
          <Switch checked={isPublic} onSwitch={setIsPublic} label="" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button outlined onClick={onClose} disabled={isUploading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!isValid || isUploading}
            loading={isUploading}>
            {isUploading ? t('pptx.upload.uploading') : t('pptx.upload.upload')}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default PptxTemplateUploader;
