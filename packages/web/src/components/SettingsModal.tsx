import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import {
  PiGear,
  PiPencilSimple,
  PiX,
  PiCaretDown,
  PiCheck,
} from 'react-icons/pi';
import {
  useSettings,
  Theme,
  Language,
  SendMessageMethod,
} from '../hooks/useSettings';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom Toggle Switch Component
const Toggle: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onCheckedChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-300'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}>
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'} `}
      />
    </button>
  );
};

// Custom Select Component using Radix
const CustomSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onValueChange, options, placeholder }) => {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="inline-flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <PiCaretDown className="h-4 w-4 text-gray-500" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="z-[100] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center rounded px-8 py-2 text-sm text-gray-900 outline-none hover:bg-gray-100 focus:bg-gray-100 data-[highlighted]:bg-gray-100">
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <PiCheck className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'ai-customize'>(
    'general'
  );

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: 'ライト' },
    { value: 'dark', label: 'ダーク' },
    { value: 'system', label: 'システム設定に従う' },
  ];

  const languageOptions: { value: Language; label: string }[] = [
    { value: 'auto', label: '自動検出' },
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  const sendMessageOptions: { value: SendMessageMethod; label: string }[] = [
    { value: 'enter', label: 'Enterで送信' },
    { value: 'ctrl-cmd-enter', label: 'Ctrl/⌘+Enterで送信' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 flex h-[600px] w-[800px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-lg bg-white shadow-lg">
          {/* Left Sidebar - Tabs */}
          <div className="flex w-48 flex-col border-r border-gray-200 bg-gray-50">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
              <Dialog.Close asChild>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-200 focus:outline-none"
                  aria-label="閉じる">
                  <PiX className="h-5 w-5 text-gray-500" />
                </button>
              </Dialog.Close>
            </div>

            {/* Tab List */}
            <div className="flex-1 py-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}>
                <PiGear className="h-5 w-5 shrink-0 text-gray-500" />
                <span>一般</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-customize')}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  activeTab === 'ai-customize'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}>
                <PiPencilSimple className="h-5 w-5 shrink-0 text-gray-500" />
                <span>AIのカスタマイズ</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex flex-1 flex-col">
            {/* Content Header */}
            <div className="flex h-14 items-center border-b border-gray-200 px-6">
              <Dialog.Title className="text-lg font-medium text-gray-900">
                {activeTab === 'general' ? '一般' : 'AIのカスタマイズ'}
              </Dialog.Title>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Theme Setting */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      テーマ
                    </label>
                    <CustomSelect
                      value={settings.theme}
                      onValueChange={(value) =>
                        updateSettings({ theme: value as Theme })
                      }
                      options={themeOptions}
                    />
                  </div>

                  {/* Language Setting */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      言語
                    </label>
                    <CustomSelect
                      value={settings.language}
                      onValueChange={(value) =>
                        updateSettings({ language: value as Language })
                      }
                      options={languageOptions}
                    />
                  </div>

                  {/* Send Message Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      メッセージの送信
                    </label>
                    <CustomSelect
                      value={settings.sendMessageMethod}
                      onValueChange={(value) =>
                        updateSettings({
                          sendMessageMethod: value as SendMessageMethod,
                        })
                      }
                      options={sendMessageOptions}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'ai-customize' && (
                <div className="space-y-6">
                  {/* Customize Enabled Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">
                      カスタマイズを有効にする
                    </label>
                    <Toggle
                      checked={settings.customizeEnabled}
                      onCheckedChange={(checked) =>
                        updateSettings({ customizeEnabled: checked })
                      }
                    />
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      カスタム指示
                    </label>
                    <textarea
                      value={settings.customInstructions}
                      onChange={(e) =>
                        updateSettings({ customInstructions: e.target.value })
                      }
                      placeholder="動作、スタイル、トーンに関する追加の設定"
                      className="h-32 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!settings.customizeEnabled}
                    />
                  </div>

                  {/* Web Search Toggle - 未実装のため非表示 */}
                  {/* <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">ウェブ検索</label>
                        <p className="mt-1 text-xs text-gray-500">
                          AIが情報を得るためにウェブ検索できるようにします
                        </p>
                      </div>
                      <Toggle
                        checked={settings.webSearchEnabled}
                        onCheckedChange={(checked) =>
                          updateSettings({ webSearchEnabled: checked })
                        }
                      />
                    </div>
                  </div> */}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SettingsModal;
