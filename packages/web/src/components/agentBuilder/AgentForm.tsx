import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import InputText from '../InputText';
import Textarea from '../Textarea';
import Select from '../Select';
import MCPServerManager from './MCPServerManager';
import { MODELS } from '../../hooks/useModel';
import { AgentConfiguration } from 'generative-ai-use-cases';

export interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  modelId: string;
  mcpServers: string[]; // Changed to string array
  codeExecutionEnabled: boolean;
  isPublic: boolean;
  tags: string[];
}

interface AgentFormProps {
  initialData?: Partial<AgentConfiguration>;
  onSave: (data: AgentFormData) => Promise<void>;
  onCancel: () => void;
  onFormDataChange?: (data: AgentFormData) => void;
  loading?: boolean;
  error?: string;
  isEditMode?: boolean;
}

const AgentForm: React.FC<AgentFormProps> = ({
  initialData,
  onSave,
  onCancel,
  onFormDataChange,
  loading = false,
  error,
  isEditMode = false,
}) => {
  const { t } = useTranslation();
  const { modelIds: availableModels, modelDisplayName } = MODELS;

  // Form state
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    systemPrompt: '',
    modelId:
      availableModels[0] || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    mcpServers: [],
    codeExecutionEnabled: false,
    isPublic: false,
    tags: [],
  });

  const [tagsInput, setTagsInput] = useState('');

  // Update formData.modelId when availableModels becomes available
  useEffect(() => {
    if (availableModels.length > 0 && !formData.modelId) {
      setFormData((prev) => ({
        ...prev,
        modelId: availableModels[0],
      }));
    }
  }, [availableModels, formData.modelId]);

  // Load initial data when provided
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        systemPrompt: initialData.systemPrompt || '',
        modelId: initialData.modelId || availableModels[0] || '',
        mcpServers: initialData.mcpServers || [],
        codeExecutionEnabled: initialData.codeExecutionEnabled || false,
        isPublic: initialData.isPublic || false,
        tags: initialData.tags || [],
      });
      setTagsInput((initialData.tags || []).join(', '));
    }
  }, [initialData, availableModels]);

  // Notify parent component when form data changes
  useEffect(() => {
    if (onFormDataChange) {
      // Parse tags from input for real-time updates
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const currentFormData: AgentFormData = {
        ...formData,
        tags,
      };

      onFormDataChange(currentFormData);
    }
  }, [formData, tagsInput, onFormDataChange]);

  const handleSave = useCallback(async () => {
    try {
      // Parse tags from input
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const agentData: AgentFormData = {
        ...formData,
        tags,
      };

      await onSave(agentData);
    } catch (error) {
      console.error('Error saving agent:', error);
    }
  }, [formData, tagsInput, onSave]);

  const isFormValid =
    formData.name && formData.systemPrompt && formData.modelId;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('agent_builder.basic_information')}
        </h2>

        <div className="space-y-4">
          <div>
            {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
            <label className="mb-2 block text-sm font-medium">
              {t('agent_builder.name')} {'*'}
            </label>
            <InputText
              value={formData.name}
              onChange={(value: string) =>
                setFormData({ ...formData, name: value })
              }
              placeholder={t('agent_builder.enter_agent_name')}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t('agent_builder.description')}
            </label>
            <Textarea
              value={formData.description}
              onChange={(value: string) =>
                setFormData({ ...formData, description: value })
              }
              placeholder={t('agent_builder.describe_agent')}
              rows={3}
            />
          </div>

          <div>
            {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
            <label className="mb-2 block text-sm font-medium">
              {t('agent_builder.model')} {'*'}
            </label>
            <Select
              value={formData.modelId}
              onChange={(value: string) =>
                setFormData({ ...formData, modelId: value })
              }
              options={availableModels.map((m) => ({
                value: m,
                label: modelDisplayName(m),
              }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t('agent_builder.tags')}
            </label>
            <InputText
              value={tagsInput}
              onChange={setTagsInput}
              placeholder={t('agent_builder.enter_tags_comma_separated')}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('agent_builder.separate_tags_with_commas')}
            </p>
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="rounded-lg border bg-white p-6">
        {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
        <h2 className="mb-4 text-lg font-semibold">
          {t('agent_builder.system_prompt')} {'*'}
        </h2>

        <Textarea
          value={formData.systemPrompt}
          onChange={(value: string) =>
            setFormData({ ...formData, systemPrompt: value })
          }
          placeholder={t('agent_builder.enter_system_prompt')}
          rows={12}
        />
      </div>

      {/* MCP Server Configuration */}
      <div className="rounded-lg border bg-white p-6">
        <MCPServerManager
          servers={formData.mcpServers}
          onChange={(servers) =>
            setFormData({ ...formData, mcpServers: servers })
          }
        />
      </div>

      {/* Tool Settings */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('agent_builder.tool_settings')}
        </h2>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="codeExecutionEnabled"
              checked={formData.codeExecutionEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  codeExecutionEnabled: e.target.checked,
                })
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <label
                htmlFor="codeExecutionEnabled"
                className="block cursor-pointer text-sm font-medium text-gray-700">
                {t('agent_builder.enable_code_execution')}
              </label>
              <p className="mt-1 text-xs text-gray-500">
                {t('agent_builder.code_execution_description')}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isPublic: e.target.checked,
                })
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <label
                htmlFor="isPublic"
                className="block cursor-pointer text-sm font-medium text-gray-700">
                {t('agent_builder.share_publicly')}
              </label>
              <p className="mt-1 text-xs text-gray-500">
                {t('agent_builder.public_sharing_description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button outlined onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={loading || !isFormValid}>
          {isEditMode ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </div>
  );
};

export default AgentForm;
