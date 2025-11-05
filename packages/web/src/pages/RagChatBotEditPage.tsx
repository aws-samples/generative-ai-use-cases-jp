import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiArrowLeft,
  PiFloppyDisk,
  PiPlus,
  PiTrash,
  PiGlobe,
  PiFile,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import {
  CreateAssistantRequest,
  UpdateAssistantRequest,
  KnowledgeSource,
} from 'generative-ai-use-cases';
import Button from '../components/Button';
import InputText from '../components/InputText';
import Textarea from '../components/Textarea';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';
import FileUploader from '../components/FileUploader';

const RagChatBotEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { botId } = useParams<{ botId?: string }>();
  const {
    getAssistant,
    createAssistant,
    updateAssistant,
    requestUploadUrl,
  } = useAssistantApi();

  const isEditMode = !!botId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    instruction: string;
    modelId: string;
    ragEnabled: boolean;
    knowledgeSources: KnowledgeSource[];
    s3Urls: string[];
  }>({
    name: '',
    description: '',
    instruction: '',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    ragEnabled: false,
    knowledgeSources: [],
    s3Urls: [],
  });

  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchBot();
    }
  }, [botId]);

  const fetchBot = async () => {
    if (!botId) return;

    setLoading(true);
    try {
      const assistant = await getAssistant(botId);
      setFormData({
        name: assistant.name,
        description: assistant.description || '',
        instruction: assistant.instruction,
        modelId: assistant.modelId,
        ragEnabled: assistant.ragEnabled,
        knowledgeSources: assistant.knowledgeSources || [],
        s3Urls: assistant.s3Urls || [],
      });
    } catch (error) {
      console.error('Failed to fetch assistant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.instruction) {
      alert(t('ragChatBot.edit.requiredFields'));
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && botId) {
        const updateRequest: UpdateAssistantRequest = {
          name: formData.name,
          description: formData.description,
          instruction: formData.instruction,
          modelId: formData.modelId,
          ragEnabled: formData.ragEnabled,
          knowledgeSources: formData.knowledgeSources,
          s3Urls: formData.s3Urls,
        };
        await updateAssistant(botId, updateRequest);
      } else {
        const createRequest: CreateAssistantRequest = {
          name: formData.name,
          description: formData.description,
          instruction: formData.instruction,
          modelId: formData.modelId,
          ragEnabled: formData.ragEnabled,
          knowledgeSources: formData.knowledgeSources,
          s3Urls: formData.s3Urls,
        };
        await createAssistant(createRequest);
      }
      navigate('/rag-chat-bot');
    } catch (error) {
      console.error('Failed to save assistant:', error);
      alert(t('ragChatBot.edit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setUploadingFiles(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Request upload URL
          const { uploadUrl, s3Url } = await requestUploadUrl({
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

          // Add S3 URL to form data
          setFormData((prev) => ({
            ...prev,
            s3Urls: [...prev.s3Urls, s3Url],
          }));
        } catch (error) {
          console.error('Failed to upload file:', error);
          alert(`Failed to upload ${file.name}`);
        }
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteFile = (s3Url: string) => {
    setFormData((prev) => ({
      ...prev,
      s3Urls: prev.s3Urls.filter((url) => url !== s3Url),
    }));
  };

  const addSourceUrl = () => {
    if (newUrl) {
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
  };

  const deleteKnowledgeSource = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.filter((_, i) => i !== index),
    }));
  };

  // const addSitemapUrl = () => {
  //   if (newSitemapUrl && formData.knowledge) {
  //     setFormData((prev) => ({
  //       ...prev,
  //       knowledge: {
  //         ...prev.knowledge!,
  //         sitemap_urls: [...prev.knowledge!.sitemap_urls, newSitemapUrl],
  //       },
  //     }));
  //     setNewSitemapUrl('');
  //   }
  // };

  // const addS3Url = () => {
  //   if (newS3Url && formData.knowledge) {
  //     setFormData((prev) => ({
  //       ...prev,
  //       knowledge: {
  //         ...prev.knowledge!,
  //         s3_urls: [...prev.knowledge!.s3_urls, newS3Url],
  //       },
  //     }));
  //     setNewS3Url('');
  //   }
  // };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingWave />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button
          outlined
          onClick={() => navigate('/rag-chat-bot')}
          className="flex items-center gap-1">
          <PiArrowLeft />
          {t('ragChatBot.edit.back')}
        </Button>
        <h1 className="flex-1 text-2xl font-bold">
          {isEditMode
            ? t('ragChatBot.edit.editTitle')
            : t('ragChatBot.edit.createTitle')}
        </h1>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('ragChatBot.edit.basicInfo')}
        </h2>

        <div className="space-y-4">
          <InputText
            label={t('ragChatBot.edit.title')}
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            required
          />

          <Textarea
            label={t('ragChatBot.edit.description')}
            value={formData.description || ''}
            onChange={(value) =>
              setFormData({ ...formData, description: value })
            }
            rows={3}
          />

          <Textarea
            label={t('ragChatBot.edit.instruction')}
            value={formData.instruction}
            onChange={(value) =>
              setFormData({ ...formData, instruction: value })
            }
            rows={6}
            required
          />

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t('ragChatBot.edit.modelId', 'Model')}
            </label>
            <select
              value={formData.modelId}
              onChange={(e) =>
                setFormData({ ...formData, modelId: e.target.value })
              }
              className="w-full rounded border border-black/30 px-3 py-2 outline-none">
              <option value="anthropic.claude-3-5-sonnet-20241022-v2:0">
                Claude 3.5 Sonnet v2
              </option>
              <option value="anthropic.claude-3-5-sonnet-20240620-v1:0">
                Claude 3.5 Sonnet v1
              </option>
              <option value="anthropic.claude-3-opus-20240229-v1:0">
                Claude 3 Opus
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ragEnabled"
              checked={formData.ragEnabled}
              onChange={(e) =>
                setFormData({ ...formData, ragEnabled: e.target.checked })
              }
              className="h-4 w-4"
            />
            <label htmlFor="ragEnabled" className="text-sm font-medium">
              {t('ragChatBot.edit.enableRAG', 'Enable RAG (Knowledge Base)')}
            </label>
          </div>
        </div>
      </Card>

      {formData.ragEnabled && (
        <Card className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <PiFile />
            {t('ragChatBot.edit.knowledge')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('ragChatBot.edit.sourceUrls')}
              </label>
              <div className="mb-2 flex gap-2">
                <InputText
                  value={newUrl}
                  onChange={setNewUrl}
                  placeholder="https://example.com"
                  className="flex-1"
                />
                <Button
                  onClick={addSourceUrl}
                  outlined
                  className="flex items-center gap-1">
                  <PiPlus />
                  {t('ragChatBot.edit.add')}
                </Button>
              </div>
              <div className="space-y-1">
                {formData.knowledgeSources
                  .filter((ks) => ks.sourceType === 'url')
                  .map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm">
                      <PiGlobe className="text-gray-500" />
                      <span className="flex-1">{source.url}</span>
                      <Button
                        outlined
                        className="text-sm"
                        onClick={() => {
                          const actualIndex =
                            formData.knowledgeSources.indexOf(source);
                          deleteKnowledgeSource(actualIndex);
                        }}>
                        <PiTrash />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('ragChatBot.edit.uploadFiles')}
              </label>
              <FileUploader
                onFileSelect={handleFileUpload}
                accept=".pdf,.txt,.doc,.docx,.md"
                multiple
              />
              {uploadingFiles && (
                <p className="mt-2 text-sm text-blue-600">
                  Uploading files...
                </p>
              )}
              <div className="mt-2 space-y-1">
                {formData.s3Urls.map((s3Url, index) => {
                  const fileName = s3Url.split('/').pop() || s3Url;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm">
                      <PiFile className="text-gray-500" />
                      <span className="flex-1">{fileName}</span>
                      <Button
                        outlined
                        className="text-sm"
                        onClick={() => handleDeleteFile(s3Url)}>
                        <PiTrash />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button outlined onClick={() => navigate('/rag-chat-bot')}>
          {t('ragChatBot.edit.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1">
          <PiFloppyDisk />
          {saving ? t('ragChatBot.edit.saving') : t('ragChatBot.edit.save')}
        </Button>
      </div>
    </div>
  );
};

export default RagChatBotEditPage;
