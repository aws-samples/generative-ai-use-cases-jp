import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiArrowLeft,
  PiFloppyDisk,
  PiFile,
  PiTrash,
  PiEye,
  PiLock,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import useAssistantForm from '../hooks/useAssistantForm';
import useUserInfo from '../hooks/useUserInfo';
import useRoleMonitor from '../hooks/useRoleMonitor';
import useTenantUseCaseConfig from '../hooks/useTenantUseCaseConfig';
import {
  CreateAssistantRequest,
  UpdateAssistantRequest,
  Assistant,
} from 'generative-ai-use-cases';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';
import BasicInfoFields from '../components/assistants/BasicInfoFields';
import KnowledgeSection from '../components/assistants/KnowledgeSection';
import ModalDialogDeleteAssistant from '../components/assistants/ModalDialogDeleteAssistant';

// Helper function to normalize user IDs for comparison
const normalizeUserId = (id?: string): string => {
  return (
    id
      ?.trim()
      .replace(/^user#/i, '')
      .toLowerCase() || ''
  );
};

const AssistantFormPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { assistantId } = useParams<{ assistantId?: string }>();
  const { getAssistant, createAssistant, updateAssistant, deleteAssistant } =
    useAssistantApi();
  const { userInfo } = useUserInfo();
  // TODO: Update after implementing AuthZ - Currently only tenantAdmin users can create assistants (workaround)
  // Check if assistant creation requires admin privileges (configurable via cdk.json)
  const { tenantConfig, loading: isConfigLoading } = useTenantUseCaseConfig();
  const { isAdmin, isLoading: isAdminLoading } = useRoleMonitor();
  const isCreateMode = !assistantId;

  // TODO: Update after implementing AuthZ - Currently only tenantAdmin users can create assistants (workaround)
  // Determine if user can create assistants based on configuration
  const assistantCreationRequiresAdmin =
    tenantConfig?.assistantCreationRequiresAdmin ?? true;
  const canCreateAssistant = !assistantCreationRequiresAdmin || isAdmin;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(!assistantId); // True for create mode, false for edit until verified
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

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

  // TODO: Update after implementing AuthZ - Currently only tenantAdmin users can create assistants (workaround)
  // Redirect users who cannot create assistants away from create mode
  // This depends on the assistantCreationRequiresAdmin configuration
  useEffect(() => {
    const configReady = !isConfigLoading && !isAdminLoading;
    if (configReady && isCreateMode && !canCreateAssistant) {
      navigate('/chat/assistants');
    }
  }, [
    isConfigLoading,
    isAdminLoading,
    isCreateMode,
    canCreateAssistant,
    navigate,
  ]);

  useEffect(() => {
    // Abort any pending request when assistantId changes
    if (abortController) {
      abortController.abort();
    }

    if (assistantId) {
      // Reset state when assistantId changes
      setAssistant(null);
      setIsOwner(false);

      // Create new AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);

      fetchAssistant(controller.signal);
    } else {
      // Create mode - reset to defaults
      setAssistant(null);
      setIsOwner(true);
      setAbortController(null);
    }

    // Cleanup on unmount
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId]);

  // Check ownership whenever assistant or userInfo changes
  useEffect(() => {
    if (assistant && userInfo) {
      const ownerCheck =
        normalizeUserId(userInfo.username) ===
        normalizeUserId(assistant.userId);
      setIsOwner(ownerCheck);
    }
  }, [assistant, userInfo]);

  const fetchAssistant = async (signal?: AbortSignal) => {
    if (!assistantId) return;

    setLoading(true);
    try {
      const fetchedAssistant = await getAssistant(assistantId);

      // Only update state if request wasn't aborted
      if (!signal?.aborted) {
        setAssistant(fetchedAssistant);

        setFormData({
          name: fetchedAssistant.name,
          description: fetchedAssistant.description || '',
          instruction: fetchedAssistant.instruction,
          modelId: fetchedAssistant.modelId,
          ragEnabled: fetchedAssistant.ragEnabled,
          visibility: fetchedAssistant.visibility,
          knowledgeSources: fetchedAssistant.knowledgeSources || [],
        });
      }
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch assistant:', error);
      // Redirect to assistants page if access is forbidden (403)
      if (
        !signal?.aborted &&
        error &&
        typeof error === 'object' &&
        'response' in error
      ) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          navigate('/chat/assistants');
          return;
        }
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!isValid()) {
      alert(t('assistant.edit.requiredFields'));
      return;
    }

    // Check if user is owner when editing
    if (assistantId && !isOwner) {
      alert(t('assistant.edit.notOwner'));
      return;
    }

    // Ensure userInfo is loaded before allowing save in edit mode
    if (assistantId && !userInfo) {
      alert(
        t('assistant.edit.userInfoNotLoaded') ||
          'User information not loaded. Please try again.'
      );
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
        visibility: formData.visibility,
        knowledgeSources: formData.knowledgeSources,
      };

      if (assistantId) {
        await updateAssistant(
          assistantId,
          requestData as UpdateAssistantRequest
        );
        navigate('/chat/assistants');
      } else {
        const assistant = await createAssistant(
          requestData as CreateAssistantRequest
        );
        navigate(`/chat/assistants/chat/${assistant.assistantId}`);
      }
    } catch (error) {
      console.error(
        `Failed to ${assistantId ? 'update' : 'create'} assistant:`,
        error
      );
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

    // Verify ownership before allowing delete
    if (!isOwner) {
      alert(t('assistant.edit.notOwner'));
      setIsDeleteModalOpen(false);
      return;
    }

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
          {t(
            assistantId
              ? 'assistant.edit.editTitle'
              : 'assistant.edit.createTitle'
          )}
        </h1>
      </div>

      {/* Read-only banner for non-owners */}
      {assistantId && !isOwner && (
        <Card className="mb-6 border-l-4 border-blue-500 bg-blue-50">
          <div className="flex items-start gap-3">
            <PiEye className="mt-0.5 text-xl text-blue-600" />
            <div>
              <h3 className="mb-1 font-semibold text-blue-900">
                {t('assistant.edit.readOnlyMode')}
              </h3>
              <p className="text-sm text-blue-800">
                {t('assistant.edit.readOnlyDescription')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Basic Information Section */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('assistant.edit.basicInfo')}
        </h2>
        <BasicInfoFields
          formData={formData}
          onChange={setFormData}
          disabled={assistantId ? !isOwner : false}
        />

        {/* Visibility Selector (only for owners) */}
        {(!assistantId || isOwner) && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('assistant.visibility.label')}
            </label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={formData.visibility === 'private'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      visibility: e.target.value as 'private' | 'public',
                    }))
                  }
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <PiLock className="text-lg text-gray-600" />
                <span className="text-sm text-gray-900">
                  {t('assistant.visibility.private')}
                </span>
                <span className="text-xs text-gray-500">
                  ({t('assistant.visibility.privateDescription')})
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      visibility: e.target.value as 'private' | 'public',
                    }))
                  }
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <PiEye className="text-lg text-gray-600" />
                <span className="text-sm text-gray-900">
                  {t('assistant.visibility.public')}
                </span>
                <span className="text-xs text-gray-500">
                  ({t('assistant.visibility.publicDescription')})
                </span>
              </label>
            </div>
          </div>
        )}
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
            disabled={assistantId ? !isOwner : false}
          />
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between gap-2">
        {assistantId && isOwner && (
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
            {assistantId && !isOwner
              ? t('assistant.edit.close')
              : t('assistant.edit.cancel')}
          </Button>
          {(!assistantId || isOwner) && (
            <Button
              onClick={handleSave}
              disabled={saving || uploadingFiles}
              className="flex items-center gap-1">
              <PiFloppyDisk />
              {saving ? t('assistant.edit.saving') : t('assistant.edit.save')}
            </Button>
          )}
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
