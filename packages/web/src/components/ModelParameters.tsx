import {
  AdditionalModelRequestFields,
  FeatureFlags,
} from 'generative-ai-use-cases';
import RangeSlider from './RangeSlider';
import { useTranslation } from 'react-i18next';

const MIN_REASONING_BUDGET = 1024; // Claude 3.7 Sonnet minimum value
const MAX_REASONING_BUDGET = 32768; // Temporary value
const REASONING_BUDGET_STEP = 1024;

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
        type: overrideModelParameters.reasoningConfig.type,
        budgetTokens: value,
      },
    });
  };

  if (!modelFeatureFlags.reasoning) {
    return null;
  }

  return (
    <div>
      {modelFeatureFlags.reasoning && (
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
