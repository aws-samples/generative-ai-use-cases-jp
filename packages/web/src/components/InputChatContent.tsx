import React, { useCallback, useMemo } from 'react';
import ButtonSend from './ButtonSend';
import Textarea from './Textarea';
import ZoomUpImage from './ZoomUpImage';
import useChat from '../hooks/useChat';
import { useLocation } from 'react-router-dom';
import Button from './Button';
import {
  PiArrowsCounterClockwise,
  PiPaperclip,
  PiSpinnerGap,
} from 'react-icons/pi';

import useFiles from '../hooks/useFiles';

type Props = {
  content: string;
  disabled?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
  resetDisabled?: boolean;
  loading?: boolean;
  onChangeContent: (content: string) => void;
  onSend: () => void;
  sendIcon?: React.ReactNode;
  // ページ下部以外で使う時に margin bottom を無効化するためのオプション
  disableMarginBottom?: boolean;
  fileUpload?: boolean;
} & (
  | {
      hideReset?: false;
      onReset: () => void;
    }
  | {
      hideReset: true;
    }
);

const InputChatContent: React.FC<Props> = (props) => {
  const { pathname } = useLocation();
  const { loading: chatLoading, isEmpty } = useChat(pathname);
  const { uploadedFiles, uploadFiles, deleteUploadedFile, uploading } =
    useFiles();

  const onChangeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // ファイルを反映しアップロード
      uploadFiles(Array.from(files));
    }
  };

  const deleteFile = useCallback(
    (fileUrl: string) => {
      deleteUploadedFile(fileUrl);
    },
    [deleteUploadedFile]
  );
  const handlePaste = async (pasteEvent: React.ClipboardEvent) => {
    const fileList = pasteEvent.clipboardData.items || [];
    const files = Array.from(fileList)
      .filter((file) => file.kind === 'file')
      .map((file) => file.getAsFile() as File);
    if (files.length > 0) {
      // ファイルをアップロード
      uploadFiles(Array.from(files));
      // ファイルの場合ファイル名もペーストされるためデフォルトの挙動を止める
      pasteEvent.preventDefault();
    }
    // ファイルがない場合はデフォルトの挙動（テキストのペースト）
  };

  const loading = useMemo(() => {
    return props.loading === undefined ? chatLoading : props.loading;
  }, [chatLoading, props.loading]);

  const disabledSend = useMemo(() => {
    return props.content === '' || props.disabled || uploading;
  }, [props.content, props.disabled, uploading]);

  return (
    <div
      className={`${
        props.fullWidth ? 'w-full' : 'w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6'
      }`}>
      <div
        className={`relative flex items-end rounded-xl border border-black/10 bg-gray-100 shadow-[0_0_30px_1px] shadow-gray-400/40 ${
          props.disableMarginBottom ? '' : 'mb-7'
        }`}>
        <div className="flex w-full flex-col">
          {props.fileUpload && uploadedFiles.length > 0 && (
            <div className="m-2 flex flex-wrap gap-2">
              {uploadedFiles.map((uploadedFile, idx) => (
                <ZoomUpImage
                  key={idx}
                  src={uploadedFile.base64EncodedImage}
                  loading={uploadedFile.uploading}
                  size="s"
                  onDelete={() => {
                    deleteFile(uploadedFile.s3Url ?? '');
                  }}
                />
              ))}
            </div>
          )}
          <Textarea
            className="scrollbar-thumb-gray-200 scrollbar-thin m-2 -mr-14 bg-transparent pr-14 "
            placeholder={props.placeholder ?? '入力してください'}
            noBorder
            notItem
            value={props.content}
            onChange={props.onChangeContent}
            onPaste={props.fileUpload ? handlePaste : undefined}
            onEnter={disabledSend ? undefined : props.onSend}
          />
        </div>
        {props.fileUpload && (
          <label>
            <input
              hidden
              onChange={onChangeFiles}
              type="file"
              accept=".jpg, .png, .gif, .webp"
              multiple
              value={[]}
            />
            <div
              className={`${uploading ? 'bg-gray-300' : 'bg-aws-smile cursor-pointer '} my-2 flex items-center justify-center rounded-xl p-2 align-bottom text-xl text-white`}>
              {uploading ? (
                <PiSpinnerGap className="animate-spin" />
              ) : (
                <PiPaperclip />
              )}
            </div>
          </label>
        )}
        <ButtonSend
          className="m-2 align-bottom"
          disabled={disabledSend}
          loading={loading || uploading}
          onClick={props.onSend}
          icon={props.sendIcon}
        />

        {!isEmpty && !props.resetDisabled && !props.hideReset && (
          <Button
            className="absolute -top-14 right-0 p-2 text-sm"
            outlined
            disabled={loading}
            onClick={props.onReset}>
            <PiArrowsCounterClockwise className="mr-2" />
            最初からやり直す
          </Button>
        )}
      </div>
    </div>
  );
};

export default InputChatContent;
