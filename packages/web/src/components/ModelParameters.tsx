import {
  AdditionalModelRequestFields,
  FeatureFlags,
} from 'generative-ai-use-cases';
import RangeSlider from './RangeSlider';
import { useTranslation } from 'react-i18next';

const MIN_REASONING_BUDGET = 1024; // Claude 3.7 Sonnet minimum value
const MAX_REASONING_BUDGET = 32768; // Temporary value
const REASONING_BUDGET_STEP = 1024;

const EFFORT_OPTIONS: {
  value: 'max' | 'high' | 'medium' | 'low';
  label: string;
}[] = [
  { value: 'max', label: 'Max' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const ModelParameters: React.FC<{
  modelFeatureFlags: FeatureFlags;
  overrideModelParameters: AdditionalModelRequestFields;
  setOverrideModelParameters: (
    overrideModelParameters: AdditionalModelRequestFields
  ) => void;
}> = ({
  modelFeatureFlags,
  overrideModelParameters,
  setOverrideModelParameters,
}) => {
  const { t } = useTranslation();

  const handleReasoningBudgetChange = (value: number) => {
    setOverrideModelParameters({
      ...overrideModelParameters,
      reasoningConfig: {
        ...overrideModelParameters.reasoningConfig,
        budgetTokens: value,
      },
    });
  };

  const handleEffortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOverrideModelParameters({
      ...overrideModelParameters,
      reasoningConfig: {
        ...overrideModelParameters.reasoningConfig,
        effort: e.target.value as 'max' | 'high' | 'medium' | 'low',
      },
    });
  };

  if (!modelFeatureFlags.reasoning) {
    return null;
  }

  return (
    <div>
      {modelFeatureFlags.adaptiveThinking ? (
        <div>
          <div className="mb-2">{t('model.parameters.reasoning_effort')}</div>
          <select
            className="w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            value={overrideModelParameters.reasoningConfig.effort ?? 'high'}
            onChange={handleEffortChange}>
            {EFFORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <div className="mb-2">{t('model.parameters.reasoning_budget')}</div>
          <div>
            <RangeSlider
              min={MIN_REASONING_BUDGET}
              max={MAX_REASONING_BUDGET}
              step={REASONING_BUDGET_STEP}
              value={overrideModelParameters.reasoningConfig.budgetTokens}
              onChange={handleReasoningBudgetChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelParameters;
