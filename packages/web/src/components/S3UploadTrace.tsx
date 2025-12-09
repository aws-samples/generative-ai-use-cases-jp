import React from 'react';
import { useTranslation } from 'react-i18next';
import ButtonCopy from './ButtonCopy';
import {
  PiCloudArrowUp,
  PiImage,
  PiFilePdf,
  PiFile,
  PiFileVideo,
  PiFileAudio,
  PiFileText,
} from 'react-icons/pi';

interface S3UploadInput {
  filepath: string;
}

interface Props {
  input: string;
}

const getFileIcon = (filepath: string) => {
  const iconProps = { className: 'h-4 w-4' };
  const extension = filepath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return <PiImage {...iconProps} />;
    case 'pdf':
      return <PiFilePdf {...iconProps} />;
    case 'mp4':
    case 'avi':
    case 'mkv':
    case 'mov':
    case 'webm':
      return <PiFileVideo {...iconProps} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return <PiFileAudio {...iconProps} />;
    case 'txt':
    case 'md':
    case 'csv':
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
      return <PiFileText {...iconProps} />;
    default:
      return <PiFile {...iconProps} />;
  }
};

const S3UploadTrace: React.FC<Props> = ({ input }) => {
  const { t } = useTranslation();

  let parsedInput: S3UploadInput;
  try {
    parsedInput = JSON.parse(input);
  } catch (error) {
    // If parsing fails, return null to let the default markdown handle it
    return null;
  }

  const { filepath } = parsedInput;

  if (!filepath) {
    return null;
  }

  const filename = filepath.split('/').pop() || filepath;

  return (
    <div className="rounded border border-green-200 bg-green-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <PiCloudArrowUp className="h-4 w-4" />
          <span className="font-medium text-green-800">
            {t('agent_core.trace_s3_upload')}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('agent_core.trace_file_path')}
          </span>
          <ButtonCopy className="text-gray-400" text={filepath} />
        </div>
        <div className="flex items-center space-x-2">
          {getFileIcon(filepath)}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            {filepath}
          </code>
        </div>
        <div className="text-sm">
          <span className="font-medium text-gray-600">
            {t('agent_core.trace_filename')}
            {t('agent_core.trace_colon')}{' '}
          </span>
          <span className="font-['Monaco','Menlo','Ubuntu_Mono',monospace] text-blue-600">
            {filename}
          </span>
        </div>
      </div>
    </div>
  );
};

export default S3UploadTrace;
