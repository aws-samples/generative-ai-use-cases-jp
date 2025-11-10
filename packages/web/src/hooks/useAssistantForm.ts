import { useState, useCallback } from 'react';
import { KnowledgeSource } from 'generative-ai-use-cases';
import useAssistantApi from './useAssistantApi';
import { MODELS } from './useModel';

export type AssistantFormData = {
  name: string;
  description: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  knowledgeSources: KnowledgeSource[];
};

export type UseAssistantFormOptions = {
  initialData?: Partial<AssistantFormData>;
};

export type UseAssistantFormReturn = {
  formData: AssistantFormData;
  setFormData: React.Dispatch<React.SetStateAction<AssistantFormData>>;
  newUrl: string;
  setNewUrl: React.Dispatch<React.SetStateAction<string>>;
  uploadingFiles: boolean;
  addKnowledgeUrl: () => void;
  removeKnowledgeSource: (index: number) => void;
  handleFileUpload: (files: FileList) => Promise<void>;
  deleteFile: (s3Url: string) => void;
  isValid: () => boolean;
  resetForm: () => void;
};

const getInitialFormData = (
  initialData?: Partial<AssistantFormData>
): AssistantFormData => ({
  name: initialData?.name || '',
  description: initialData?.description || '',
  instruction: initialData?.instruction || '',
  modelId: initialData?.modelId || MODELS.modelIds[0] || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  ragEnabled: initialData?.ragEnabled || false,
  knowledgeSources: initialData?.knowledgeSources || [],
});

const useAssistantForm = (
  options: UseAssistantFormOptions = {}
): UseAssistantFormReturn => {
  const { requestUploadUrl } = useAssistantApi();
  const [formData, setFormData] = useState<AssistantFormData>(() =>
    getInitialFormData(options.initialData)
  );
  const [newUrl, setNewUrl] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const addKnowledgeUrl = useCallback(() => {
    if (newUrl.trim()) {
      const newSource: KnowledgeSource = {
        sourceType: 'url',
        name: newUrl,
        url: newUrl,
      };
      setFormData((prev) => ({
        ...prev,
        knowledgeSources: [...prev.knowledgeSources, newSource],
      }));
      setNewUrl('');
    }
  }, [newUrl]);

  const removeKnowledgeSource = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.filter((_, i) => i !== index),
    }));
  }, []);

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setUploadingFiles(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            // Request upload URL
            const { uploadUrl, fileKey } = await requestUploadUrl({
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type,
            });

            // Upload file to S3
            await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type,
              },
            });

            // Add file to knowledge sources with proper structure
            const newSource: KnowledgeSource = {
              id: crypto.randomUUID(),
              type: 'file',
              sourceType: 'file',
              name: file.name,
              displayName: file.name,
              storageKey: fileKey,
            };

            setFormData((prev) => ({
              ...prev,
              knowledgeSources: [...prev.knowledgeSources, newSource],
            }));
          } catch (error) {
            console.error('Failed to upload file:', error);
            alert(`Failed to upload ${file.name}`);
          }
        }
      } finally {
        setUploadingFiles(false);
      }
    },
    [requestUploadUrl]
  );

  const deleteFile = useCallback((sourceId: string) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.filter((ks) => ks.id !== sourceId),
    }));
  }, []);

  const isValid = useCallback(() => {
    return !!formData.name.trim() && !!formData.instruction.trim();
  }, [formData.name, formData.instruction]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData(options.initialData));
    setNewUrl('');
  }, [options.initialData]);

  return {
    formData,
    setFormData,
    newUrl,
    setNewUrl,
    uploadingFiles,
    addKnowledgeUrl,
    removeKnowledgeSource,
    handleFileUpload,
    deleteFile,
    isValid,
    resetForm,
  };
};

export default useAssistantForm;
