import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
  PiArrowLeft,
  PiFloppyDisk,
  PiPlus,
  PiTrash,
  PiGlobe,
  PiFile,
} from 'react-icons/pi';
import useBedrockChatApi, {
  BedrockChatBotInput,
} from '../hooks/useBedrockChatApi';
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
  const { getPrivateBot, createBot, updateBot, getBotPresignedUrl, deleteBotUploadedFile } = useBedrockChatApi();

  const isEditMode = !!botId;
  const tempBotId = useMemo(() => uuidv4(), []);
  const currentBotId = botId || tempBotId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const [formData, setFormData] = useState<BedrockChatBotInput>({
    id: tempBotId,
    title: '',
    description: '',
    instruction: '',
    generationParams: {
      maxTokens: 63991,
      temperature: 0.1,
      topP: 0.5,
      topK: 50,
    },
    knowledge: {
      sourceUrls: [],
      sitemapUrls: [],
      filenames: [],
      s3Urls: [],
    },
    displayRetrievedChunks: false,
    promptCachingEnabled: true,
    conversationQuickStarters: [],
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
      const bot = await getPrivateBot(botId);
      setFormData({
        title: bot.title,
        description: bot.description || '',
        instruction: bot.instruction,
        generationParams: {
          maxTokens: 63991,
          temperature: 0.1,
          topP: 0.5,
          topK: 50,
        },
        knowledge: bot.knowledge || {
          sourceUrls: [],
          sitemapUrls: [],
          filenames: [],
          s3Urls: [],
        },
        displayRetrievedChunks: bot.displayRetrievedChunks || false,
        promptCachingEnabled: bot.promptCachingEnabled ?? true,
        conversationQuickStarters: bot.conversationQuickStarters || [],
      });
      setUploadedFiles(bot.knowledge?.filenames || []);
    } catch (error) {
      console.error('Failed to fetch bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.instruction) {
      alert(t('ragChatBot.edit.requiredFields'));
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && botId) {
        await updateBot(botId, formData);
      } else {
        await createBot(formData);
      }
      navigate('/rag-chat-bot');
    } catch (error) {
      console.error('Failed to save bot:', error);
      alert(t('ragChatBot.edit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { url } = await getBotPresignedUrl(
          currentBotId,
          file.name,
          file.type
        );
        
        await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        setUploadedFiles((prev) => [...prev, file.name]);
        setFormData((prev) => ({
          ...prev,
          knowledge: {
            ...prev.knowledge!,
            filenames: [...prev.knowledge!.filenames, file.name],
          },
        }));
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (currentBotId) {
      try {
        await deleteBotUploadedFile(currentBotId, filename);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
    
    setUploadedFiles((prev) => prev.filter((f) => f !== filename));
    setFormData((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge!,
        filenames: prev.knowledge!.filenames.filter((f) => f !== filename),
      },
    }));
  };

  const addSourceUrl = () => {
    if (newUrl && formData.knowledge) {
      setFormData((prev) => ({
        ...prev,
        knowledge: {
          ...prev.knowledge!,
          sourceUrls: [...prev.knowledge!.sourceUrls, newUrl],
        },
      }));
      setNewUrl('');
    }
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
      <div className="flex justify-center items-center h-screen">
        <LoadingWave />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Button
          outlined
          onClick={() => navigate('/rag-chat-bot')}
          className="flex items-center gap-1"
        >
          <PiArrowLeft />
          {t('ragChatBot.edit.back')}
        </Button>
        <h1 className="text-2xl font-bold flex-1">
          {isEditMode ? t('ragChatBot.edit.editTitle') : t('ragChatBot.edit.createTitle')}
        </h1>
      </div>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('ragChatBot.edit.basicInfo')}</h2>
        
        <div className="space-y-4">
          <InputText
            label={t('ragChatBot.edit.title')}
            value={formData.title}
            onChange={(value) => setFormData({ ...formData, title: value })}
            required
          />
          
          <Textarea
            label={t('ragChatBot.edit.description')}
            value={formData.description || ''}
            onChange={(value) => setFormData({ ...formData, description: value })}
            rows={3}
          />
          
          <Textarea
            label={t('ragChatBot.edit.instruction')}
            value={formData.instruction}
            onChange={(value) => setFormData({ ...formData, instruction: value })}
            rows={6}
            required
          />
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PiFile />
          {t('ragChatBot.edit.knowledge')}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('ragChatBot.edit.sourceUrls')}
            </label>
            <div className="flex gap-2 mb-2">
              <InputText
                value={newUrl}
                onChange={setNewUrl}
                placeholder="https://example.com"
                className="flex-1"
              />
              <Button onClick={addSourceUrl} outlined className="flex items-center gap-1">
                <PiPlus />
                {t('ragChatBot.edit.add')}
              </Button>
            </div>
            <div className="space-y-1">
              {formData.knowledge?.sourceUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <PiGlobe className="text-gray-500" />
                  <span className="flex-1">{url}</span>
                  <Button
                    outlined
                    className="text-sm"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        knowledge: {
                          ...formData.knowledge!,
                          sourceUrls: formData.knowledge!.sourceUrls.filter(
                            (_, i) => i !== index
                          ),
                        },
                      })
                    }
                  >
                    <PiTrash />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('ragChatBot.edit.uploadFiles')}
            </label>
            <FileUploader
              onFileSelect={handleFileUpload}
              accept=".pdf,.txt,.doc,.docx,.md"
              multiple
            />
            <div className="mt-2 space-y-1">
              {uploadedFiles.map((filename) => (
                <div key={filename} className="flex items-center gap-2 text-sm">
                  <PiFile className="text-gray-500" />
                  <span className="flex-1">{filename}</span>
                  <Button
                    outlined
                    className="text-sm"
                    onClick={() => handleDeleteFile(filename)}
                  >
                    <PiTrash />
                  </Button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          outlined
          onClick={() => navigate('/rag-chat-bot')}
        >
          {t('ragChatBot.edit.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1"
        >
          <PiFloppyDisk />
          {saving ? t('ragChatBot.edit.saving') : t('ragChatBot.edit.save')}
        </Button>
      </div>
    </div>
  );
};

export default RagChatBotEditPage;