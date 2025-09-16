import React, { useRef } from 'react';
import { BaseProps } from '../@types/common';
import { PiUploadSimple } from 'react-icons/pi';

type Props = BaseProps & {
  accept?: string;
  multiple?: boolean;
  onFileSelect?: (files: FileList) => void;
  label?: string;
};

const FileUploader: React.FC<Props> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && props.onFileSelect) {
      props.onFileSelect(e.target.files);
    }
  };

  return (
    <div className={props.className}>
      {props.label && <span className="text-sm">{props.label}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <PiUploadSimple />
        <span>Upload Files</span>
      </button>
    </div>
  );
};

export default FileUploader;