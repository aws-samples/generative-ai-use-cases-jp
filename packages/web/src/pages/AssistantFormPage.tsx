import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PiArrowLeft, PiFloppyDisk, PiFile, PiTrash } from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import useAssistantForm from '../hooks/useAssistantForm';
import {
  CreateAssistantRequest,
  UpdateAssistantRequest,
} from 'generative-ai-use-cases';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';
import BasicInfoFields from '../components/assistants/BasicInfoFields';
import KnowledgeSection from '../components/assistants/KnowledgeSection';
import ModalDialogDeleteAssistant from '../components/assistants/ModalDialogDeleteAssistant';

const AssistantFormPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { assistantId } = useParams<{ assistantId?: string }>();
  const { getAssistant, createAssistant, updateAssistant, deleteAssistant } = useAssistantApi();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
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
  } = useAssistantForm();

  useEffect(() => {
    if (assistantId) {
      fetchAssistant();
    }
  }, [assistantId]);

  const fetchAssistant = async () => {
    if (!assistantId) return;

    setLoading(true);
    try {
      const assistant = await getAssistant(assistantId);
      setFormData({
        name: assistant.name,
        description: assistant.description || '',
        instruction: assistant.instruction,
        modelId: assistant.modelId,
        ragEnabled: assistant.ragEnabled,
        knowledgeSources: assistant.knowledgeSources || [],
      });
    } catch (error) {
      console.error('Failed to fetch assistant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isValid()) {
      alert(t('assistant.edit.requiredFields'));
      return;
    }

    setSaving(true);
    try {
      const requestData: CreateAssistantRequest | UpdateAssistantRequest = {
        name: formData.name,
        description: formData.description,
        instruction: formData.instruction,
        modelId: formData.modelId,
        ragEnabled: formData.ragEnabled,
        knowledgeSources: formData.knowledgeSources,
      };

      if (assistantId) {
        await updateAssistant(assistantId, requestData as UpdateAssistantRequest);
        navigate('/chat/assistants');
      } else {
        const assistant = await createAssistant(requestData as CreateAssistantRequest);
        navigate(`/chat/assistants/chat/${assistant.assistantId}`);
      }
    } catch (error) {
      console.error(`Failed to ${assistantId ? 'update' : 'create'} assistant:`, error);
      alert(t('assistant.edit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/chat/assistants');
  };

  const handleDelete = async () => {
    if (!assistantId) return;

    setDeleting(true);
    try {
      await deleteAssistant(assistantId);
      navigate('/chat/assistants');
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      alert(t('assistant.deleteError'));
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingWave />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          outlined
          onClick={handleCancel}
          className="flex items-center gap-1">
          <PiArrowLeft />
          {t('assistant.edit.back')}
        </Button>
        <h1 className="flex-1 text-2xl font-bold">
          {t(assistantId ? 'assistant.edit.editTitle' : 'assistant.edit.createTitle')}
        </h1>
      </div>

      {/* Basic Information Section */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('assistant.edit.basicInfo')}
        </h2>
        <BasicInfoFields formData={formData} onChange={setFormData} />
      </Card>

      {/* Knowledge Section */}
      {formData.ragEnabled && (
        <Card className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <PiFile />
            {t('assistant.edit.knowledge')}
          </h2>
          <KnowledgeSection
            ragEnabled={formData.ragEnabled}
            knowledgeSources={formData.knowledgeSources}
            newUrl={newUrl}
            uploadingFiles={uploadingFiles}
            onNewUrlChange={setNewUrl}
            onAddUrl={addKnowledgeUrl}
            onRemoveSource={removeKnowledgeSource}
            onFileUpload={handleFileUpload}
            onDeleteFile={deleteFile}
          />
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between gap-2">
        {assistantId && (
          <Button
            outlined
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={deleting}
            className="flex items-center gap-1 border-red-600 text-red-600 hover:bg-red-50">
            <PiTrash />
            {t('assistant.delete')}
          </Button>
        )}
        <div className="flex flex-1 justify-end gap-2">
          <Button outlined onClick={handleCancel}>
            {t('assistant.edit.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploadingFiles}
            className="flex items-center gap-1">
            <PiFloppyDisk />
            {saving ? t('assistant.edit.saving') : t('assistant.edit.save')}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ModalDialogDeleteAssistant
        isOpen={isDeleteModalOpen}
        assistantName={formData.name}
        deleting={deleting}
        onDelete={handleDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default AssistantFormPage;