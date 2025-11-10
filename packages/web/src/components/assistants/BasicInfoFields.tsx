import React from 'react';
import { useTranslation } from 'react-i18next';
import InputText from '../InputText';
import Textarea from '../Textarea';
import { MODELS } from '../../hooks/useModel';
import { AssistantFormData } from '../../hooks/useAssistantForm';

export type BasicInfoFieldsProps = {
  formData: AssistantFormData;
  onChange: (data: AssistantFormData) => void;
};

const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  formData,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <InputText
        label={t('assistant.edit.title')}
        value={formData.name}
        onChange={(value) => onChange({ ...formData, name: value })}
        required
      />

      <Textarea
        label={t('assistant.edit.description')}
        value={formData.description || ''}
        onChange={(value) => onChange({ ...formData, description: value })}
        rows={3}
      />

      <Textarea
        label={t('assistant.edit.instruction')}
        value={formData.instruction}
        onChange={(value) => onChange({ ...formData, instruction: value })}
        rows={6}
        required
      />

      <div>
        <label className="mb-2 block text-sm font-medium">
          {t('assistant.edit.modelId', 'Model')}
        </label>
        <select
          value={formData.modelId}
          onChange={(e) => onChange({ ...formData, modelId: e.target.value })}
          className="w-full rounded border border-black/30 px-3 py-2 outline-none">
          {MODELS.modelIds.map((modelId) => (
            <option key={modelId} value={modelId}>
              {MODELS.modelDisplayName(modelId)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ragEnabled"
          checked={formData.ragEnabled}
          onChange={(e) =>
            onChange({ ...formData, ragEnabled: e.target.checked })
          }
          className="h-4 w-4"
        />
        <label htmlFor="ragEnabled" className="text-sm font-medium">
          {t('assistant.edit.enableRAG', 'Enable RAG (Knowledge Base)')}
        </label>
      </div>
    </div>
  );
};

export default BasicInfoFields;
