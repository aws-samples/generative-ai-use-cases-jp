import React, { useEffect, useMemo, useRef, useState } from 'react';
import ButtonSend from './ButtonSend';
import Textarea from './Textarea';
import ZoomUpImage from './ZoomUpImage';
import useChat from '../hooks/useChat';
import { useLocation } from 'react-router-dom';
import Button from './Button';
import { PiArrowsCounterClockwise, PiPaperclip } from 'react-icons/pi';
import { ExtraData } from 'generative-ai-use-cases-jp';
import useFileApi from '../hooks/useFileApi';

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
  uploadedFiles?: ExtraData[];
  onChangeFiles?: (files: File[]) => void;
  uploadFiles?: () => void;
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
  const ref = useRef<HTMLInputElement>(null);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const { getDocDownloadSignedUrl } = useFileApi();

  const onChangeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // ファイルを反映しアップロード
      if (props.onChangeFiles) {
        props.onChangeFiles(Array.from(files));
      }
      if (props.uploadFiles) {
        props.uploadFiles();
      }
    } else {
      if (props.onChangeFiles) {
        props.onChangeFiles([]);
      }
    }
  };

  useEffect(() => {
    // アップロードされたファイルの URL が更新されたら Signed URL を更新
    if (props.uploadedFiles) {
      Promise.all(
        props.uploadedFiles.map(async (file) => {
          return await getDocDownloadSignedUrl(file.source.data);
        })
      ).then((results) => setSignedUrls(results));
    } else {
      setSignedUrls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.uploadedFiles]);

  const loading = useMemo(() => {
    return props.loading === undefined ? chatLoading : props.loading;
  }, [chatLoading, props.loading]);

  const disabledSend = useMemo(() => {
    return props.content === '' || props.disabled;
  }, [props.content, props.disabled]);

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
          {signedUrls.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {signedUrls.map((url: string) => (
                <ZoomUpImage key={url} src={url} size={24} />
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
            onEnter={disabledSend ? undefined : props.onSend}
          />
        </div>
        {props.fileUpload && (
          <label>
            <input
              className="hidden"
              onChange={onChangeFiles}
              id="file_input"
              type="file"
              accept=".jpg, .png, .gif, .webp"
              multiple={true}
              ref={ref}></input>
            <div className="bg-aws-smile my-2 flex cursor-pointer items-center justify-center rounded-xl p-2 align-bottom text-xl text-white">
              <PiPaperclip />
            </div>
          </label>
        )}
        <ButtonSend
          className="m-2 align-bottom"
          disabled={disabledSend}
          loading={loading}
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
