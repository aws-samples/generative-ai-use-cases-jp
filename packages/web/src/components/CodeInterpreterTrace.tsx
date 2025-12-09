import React from 'react';
import { useTranslation } from 'react-i18next';
import ButtonCopy from './ButtonCopy';
import Markdown from './Markdown';
import {
  PiTerminal,
  PiCode,
  PiRocket,
  PiList,
  PiFile,
  PiPencil,
  PiFolder,
  PiTrash,
  PiDownloadSimple,
} from 'react-icons/pi';

interface CodeInterpreterInput {
  action: {
    type: string;
    // executeCode specific
    language?: string;
    code?: string;
    session_name?: string;
    clear_context?: boolean;
    // executeCommand specific
    command?: string;
    // initSession specific
    description?: string;
    // readFiles, removeFiles specific
    paths?: string[];
    // writeFiles specific
    content?: Array<{
      path: string;
      text: string;
    }>;
    // listFiles specific
    path?: string;
    // downloadFiles specific
    source_paths?: string[];
    destination_dir?: string;
  };
}

interface Props {
  input: string;
}

const getActionIcon = (type: string) => {
  const iconProps = { className: 'h-4 w-4' };

  switch (type) {
    case 'executeCode':
      return <PiCode {...iconProps} />;
    case 'executeCommand':
      return <PiTerminal {...iconProps} />;
    case 'initSession':
      return <PiRocket {...iconProps} />;
    case 'listLocalSessions':
      return <PiList {...iconProps} />;
    case 'readFiles':
      return <PiFile {...iconProps} />;
    case 'writeFiles':
      return <PiPencil {...iconProps} />;
    case 'listFiles':
      return <PiFolder {...iconProps} />;
    case 'removeFiles':
      return <PiTrash {...iconProps} />;
    case 'downloadFiles':
      return <PiDownloadSimple {...iconProps} />;
    default:
      return <PiCode {...iconProps} />;
  }
};

const getLanguageDisplayName = (language: string): string => {
  const languageMap: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    bash: 'Bash',
    shell: 'Shell',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rust: 'Rust',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    r: 'R',
    julia: 'Julia',
    matlab: 'MATLAB',
    perl: 'Perl',
    lua: 'Lua',
  };

  return languageMap[language.toLowerCase()] || language;
};

const CodeInterpreterTrace: React.FC<Props> = ({ input }) => {
  const { t } = useTranslation();

  let parsedInput: CodeInterpreterInput;
  try {
    const rawParsed = JSON.parse(input);

    // Check for code_interpreter_input wrapper
    if (rawParsed.code_interpreter_input !== undefined) {
      const codeInterpreterInput = rawParsed.code_interpreter_input;

      // Handle case where value is stringified JSON
      if (typeof codeInterpreterInput === 'string') {
        parsedInput = JSON.parse(codeInterpreterInput);
      } else {
        parsedInput = codeInterpreterInput;
      }
    } else if (rawParsed.action) {
      // Direct action format (fallback)
      parsedInput = rawParsed;
    } else {
      // No valid format found
      return null;
    }
  } catch (error) {
    // If parsing fails, return null to let the default markdown handle it
    return null;
  }

  // Validate action exists
  if (!parsedInput.action) {
    return null;
  }

  const { action } = parsedInput;
  const actionType = action.type;

  const renderExecuteCode = () => {
    if (!action.code || !action.language) return null;

    const fullCodeContent = action.code;
    const languageDisplay = getLanguageDisplayName(action.language);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_language')}
            {t('agent_core.trace_colon')} {languageDisplay}
          </span>
          <ButtonCopy className="text-gray-400" text={fullCodeContent} />
        </div>
        <div className="max-h-80 overflow-auto rounded">
          <Markdown prefix="code-interpreter-code">
            {t('agent_core.trace_code_block', {
              language: action.language,
              code: fullCodeContent,
            })}
          </Markdown>
        </div>
      </div>
    );
  };

  const renderExecuteCommand = () => {
    if (!action.command) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_command')}
          </span>
          <ButtonCopy className="text-gray-400" text={action.command || ''} />
        </div>
        <div className="rounded border bg-gray-900 p-3">
          <code className="text-green-400">
            {t('agent_core.trace_command_prefix')} {action.command}
          </code>
        </div>
      </div>
    );
  };

  const renderInitSession = () => {
    return (
      <div className="space-y-2">
        {action.session_name && (
          <div className="text-sm">
            <span className="font-medium text-gray-600">
              {t('agent_core.trace_session_name')}
              {t('agent_core.trace_colon')}{' '}
            </span>
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              {action.session_name}
            </code>
          </div>
        )}
        {action.description && (
          <div className="text-sm">
            <span className="font-medium text-gray-600">
              {t('agent_core.trace_description')}
              {t('agent_core.trace_colon')}{' '}
            </span>
            <span>{action.description}</span>
          </div>
        )}
      </div>
    );
  };

  const renderReadFiles = () => {
    if (!action.paths || action.paths.length === 0) return null;

    const pathsText = action.paths.join('\n');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_file_paths')}
          </span>
          <ButtonCopy className="text-gray-400" text={pathsText} />
        </div>
        <div className="space-y-1">
          {action.paths.map((path, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-gray-400">
                {t('agent_core.trace_list_marker')}
              </span>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                {path}
              </code>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWriteFiles = () => {
    if (!action.content || action.content.length === 0) return null;

    return (
      <div className="space-y-3">
        {action.content.map((file, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">
                  {t('agent_core.trace_file_icon')}
                </span>
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs font-medium">
                  {file.path}
                </code>
              </div>
              <ButtonCopy className="text-gray-400" text={file.text} />
            </div>
            <div className="max-h-80 overflow-auto rounded border bg-gray-50 p-3">
              <Markdown prefix={`code-interpreter-file-${index}`}>
                {t('agent_core.trace_file_content_block', {
                  content: file.text,
                })}
              </Markdown>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListFiles = () => {
    const path = action.path || '/';
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_directory')}
          </span>
          <ButtonCopy className="text-gray-400" text={path} />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">
            {t('agent_core.trace_folder_icon')}
          </span>
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            {path}
          </code>
        </div>
      </div>
    );
  };

  const renderRemoveFiles = () => {
    if (!action.paths || action.paths.length === 0) return null;

    const pathsText = action.paths.join('\n');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_files_to_remove')}
          </span>
          <ButtonCopy className="text-gray-400" text={pathsText} />
        </div>
        <div className="space-y-1">
          {action.paths.map((path, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-red-400">
                {t('agent_core.trace_trash_icon')}
              </span>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                {path}
              </code>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDownloadFiles = () => {
    const sourcePaths = action.source_paths || [];
    const destinationDir = action.destination_dir || '/tmp';
    const pathsText = sourcePaths.join('\n');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_source_files')}
          </span>
          <ButtonCopy className="text-gray-400" text={pathsText} />
        </div>
        <div className="space-y-1">
          {sourcePaths.map((path, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-gray-400">
                {t('agent_core.trace_list_marker')}
              </span>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                {path}
              </code>
            </div>
          ))}
        </div>
        <div className="text-sm">
          <span className="font-medium text-gray-600">
            {t('agent_core.trace_destination')}
            {t('agent_core.trace_colon')}{' '}
          </span>
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            {destinationDir}
          </code>
        </div>
      </div>
    );
  };

  const renderListLocalSessions = () => {
    return (
      <div className="text-sm text-gray-600">
        {t('agent_core.trace_list_sessions')}
      </div>
    );
  };

  const renderActionContent = () => {
    switch (actionType) {
      case 'executeCode':
        return renderExecuteCode();
      case 'executeCommand':
        return renderExecuteCommand();
      case 'initSession':
        return renderInitSession();
      case 'readFiles':
        return renderReadFiles();
      case 'writeFiles':
        return renderWriteFiles();
      case 'listFiles':
        return renderListFiles();
      case 'removeFiles':
        return renderRemoveFiles();
      case 'downloadFiles':
        return renderDownloadFiles();
      case 'listLocalSessions':
        return renderListLocalSessions();
      default:
        return (
          <div className="text-sm text-gray-500">
            {t('agent_core.trace_unknown_action')}
            {t('agent_core.trace_colon')} {actionType}
          </div>
        );
    }
  };

  return (
    <div className="rounded border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getActionIcon(actionType)}
          <span className="font-medium text-blue-800">
            {t('agent_core.trace_code_interpreter')} {t('common.hyphen')}{' '}
            {actionType}
          </span>
        </div>
      </div>
      {renderActionContent()}
    </div>
  );
};

export default CodeInterpreterTrace;
