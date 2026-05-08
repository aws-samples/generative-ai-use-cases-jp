import React from 'react';
import { useTranslation } from 'react-i18next';
import { BiAbacus } from 'react-icons/bi';
import { FaTimeline } from 'react-icons/fa6';
import { PiCheck } from 'react-icons/pi';
import { RiMindMap } from 'react-icons/ri';
import { VscTypeHierarchy } from 'react-icons/vsc';
import Button from '../Button';
import ModalDialog from '../ModalDialog';
import Select from '../Select';
import Switch from '../Switch';
import Textarea from '../Textarea';
import { MeetingMinutesParams, DiagramOption } from '../../prompts';
import { IconType } from 'react-icons';

interface DiagramOptionInfo {
  id: DiagramOption;
  icon: IconType;
  labelKey: string;
}

const DIAGRAM_OPTIONS: DiagramOptionInfo[] = [
  {
    id: 'mindmap',
    icon: RiMindMap,
    labelKey: 'meetingMinutes.diagram_mindmap',
  },
  {
    id: 'flowchart',
    icon: VscTypeHierarchy,
    labelKey: 'meetingMinutes.diagram_flowchart',
  },
  {
    id: 'timeline',
    icon: FaTimeline,
    labelKey: 'meetingMinutes.diagram_timeline',
  },
  {
    id: 'sequence',
    icon: BiAbacus,
    labelKey: 'meetingMinutes.diagram_sequence',
  },
];

interface DiagramOptionCardProps {
  option: DiagramOptionInfo;
  isSelected: boolean;
  onToggle: () => void;
}

const DiagramOptionCard: React.FC<DiagramOptionCardProps> = ({
  option,
  isSelected,
  onToggle,
}) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onToggle}
      className={`relative min-h-[150px] max-w-[130px] rounded-lg border px-2 py-3 transition-colors hover:bg-blue-50
        ${isSelected ? 'border-blue-600 bg-blue-100' : 'border-gray-400 bg-white'}`}>
      {isSelected && (
        <div className="absolute right-1 top-1">
          <PiCheck className="size-4 text-blue-600" />
        </div>
      )}
      <div className="flex flex-col items-center justify-center">
        {React.createElement(option.icon, {
          size: '1.5rem',
          className: `mx-auto ${isSelected ? 'text-gray-900' : 'text-gray-500'}`,
        })}
        <div
          className={`mt-2 text-xs font-bold ${isSelected ? 'text-black' : 'text-gray-500'}`}>
          {t(option.labelKey)}
        </div>
      </div>
    </button>
  );
};

interface MeetingMinutesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Style settings
  minutesStyle: MeetingMinutesParams['style'];
  setMinutesStyle: (style: MeetingMinutesParams['style']) => void;
  // Model settings
  modelId: string;
  setModelId: (modelId: string) => void;
  availableModels: string[];
  modelDisplayName: (modelId: string) => string;
  // Custom prompt
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  // Diagram options
  diagramOptions: DiagramOption[];
  toggleDiagramOption: (option: DiagramOption) => void;
  // Auto-generation
  autoGenerate: boolean;
  setAutoGenerate: (value: boolean) => void;
  generationFrequency: number;
  setGenerationFrequency: (value: number) => void;
  // System prompt preview
  getSystemPrompt: (
    style: MeetingMinutesParams['style'],
    customPrompt?: string,
    diagramOptions?: DiagramOption[]
  ) => string;
}

const MeetingMinutesSettingsModal: React.FC<
  MeetingMinutesSettingsModalProps
> = ({
  isOpen,
  onClose,
  minutesStyle,
  setMinutesStyle,
  modelId,
  setModelId,
  availableModels,
  modelDisplayName,
  customPrompt,
  setCustomPrompt,
  diagramOptions,
  toggleDiagramOption,
  autoGenerate,
  setAutoGenerate,
  generationFrequency,
  setGenerationFrequency,
  getSystemPrompt,
}) => {
  const { t } = useTranslation();

  return (
    <ModalDialog
      isOpen={isOpen}
      title={t('meetingMinutes.settings')}
      onClose={onClose}>
      <div className="space-y-4">
        {/* Style and Model selection - horizontal layout */}
        <div className="flex gap-4">
          {/* Style selection */}
          <div className="flex-1">
            <label className="mb-2 block font-bold">
              {t('meetingMinutes.style')}
            </label>
            <Select
              value={minutesStyle}
              onChange={(value) =>
                setMinutesStyle(value as MeetingMinutesParams['style'])
              }
              options={[
                {
                  value: 'summary',
                  label: t('meetingMinutes.style_summary'),
                },
                {
                  value: 'detail',
                  label: t('meetingMinutes.style_detail'),
                },
                {
                  value: 'faq',
                  label: t('meetingMinutes.style_faq'),
                },
                {
                  value: 'transcription',
                  label: t('meetingMinutes.style_transcription'),
                },
                {
                  value: 'diagram',
                  label: t('meetingMinutes.style_diagram'),
                },
                {
                  value: 'whiteboard',
                  label: t('meetingMinutes.style_whiteboard'),
                },
                {
                  value: 'newspaper',
                  label: t('meetingMinutes.style_newspaper'),
                },
                {
                  value: 'custom',
                  label: t('meetingMinutes.style_custom'),
                },
              ]}
            />
          </div>

          {/* Model selection */}
          <div className="flex-1">
            <label className="mb-2 block font-bold">
              {t('meetingMinutes.model')}
            </label>
            <Select
              value={modelId}
              onChange={setModelId}
              options={availableModels.map((id) => ({
                value: id,
                label: modelDisplayName(id),
              }))}
            />
          </div>
        </div>

        {/* System prompt preview (when style is not 'custom') */}
        {minutesStyle !== 'custom' && (
          <div className="mt-2">
            <details className="group">
              <summary className="cursor-pointer list-none text-xs text-gray-500 hover:text-gray-700">
                <span className="group-open:hidden">
                  {t('meetingMinutes.view_prompt')}
                </span>
                <span className="hidden group-open:inline">
                  {t('meetingMinutes.hide_prompt')}
                </span>
              </summary>
              <div className="mt-2 rounded border bg-gray-50 p-2">
                <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-gray-600">
                  {getSystemPrompt(minutesStyle, customPrompt, diagramOptions)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* Custom prompt (when style is 'custom') */}
        {minutesStyle === 'custom' && (
          <div>
            <label className="mb-1 block text-sm font-bold">
              {t('meetingMinutes.custom_prompt')}
            </label>
            <Textarea
              placeholder={t('meetingMinutes.custom_prompt_placeholder')}
              value={customPrompt}
              onChange={setCustomPrompt}
              maxHeight={120}
            />
          </div>
        )}

        {/* Diagram options (when style is 'diagram') */}
        {minutesStyle === 'diagram' && (
          <div>
            <label className="mb-2 block text-sm font-bold">
              {t('meetingMinutes.diagram_options')}
            </label>
            <div className="flex flex-wrap justify-start gap-3">
              {DIAGRAM_OPTIONS.map((option) => (
                <DiagramOptionCard
                  key={option.id}
                  option={option}
                  isSelected={diagramOptions.includes(option.id)}
                  onToggle={() => toggleDiagramOption(option.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Auto-generation controls */}
        <div className="border-t pt-4">
          <Switch
            label={t('meetingMinutes.auto_generate')}
            checked={autoGenerate}
            onSwitch={setAutoGenerate}
          />
          {autoGenerate && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-bold">
                {t('meetingMinutes.generation_frequency')}
              </label>
              <Select
                value={generationFrequency.toString()}
                onChange={(value) => setGenerationFrequency(Number(value))}
                options={[
                  { value: '1', label: t('meetingMinutes.frequency_1min') },
                  { value: '3', label: t('meetingMinutes.frequency_3min') },
                  { value: '5', label: t('meetingMinutes.frequency_5min') },
                  {
                    value: '10',
                    label: t('meetingMinutes.frequency_10min'),
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="flex justify-end border-t pt-4">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default MeetingMinutesSettingsModal;
