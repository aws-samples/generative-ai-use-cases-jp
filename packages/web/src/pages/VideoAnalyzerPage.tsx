import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import useFileApi from '../hooks/useFileApi';
import { UploadedFileType } from 'generative-ai-use-cases-jp';
import { extractBaseURL } from '../hooks/useFiles';
import { create } from 'zustand';
import { getPrompter } from '../prompts';
import { MODELS } from '../hooks/useModel';
import Textarea from '../components/Textarea';

type StateType = {
  content: string;
  setContent: (c: string) => void;
  clear: () => void;
};

const useVideoAnalyzerPageState = create<StateType>((set) => {
  const INIT_STATE = {
    content: '',
  };
  return {
    ...INIT_STATE,
    setContent: (c: string) => {
      set(() => ({
        content: c,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const VideoAnalyzerPage: React.FC = () => {
  const { content, setContent } = useVideoAnalyzerPageState();
  const [intervalId, setIntervalId] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const videoElement = useRef(null);
  const callbackRef = React.useRef<() => void>();
  const { getSignedUrl, uploadFile } = useFileApi();
  const { pathname } = useLocation();
  const { getModelId, setModelId, loading, messages, postChat } =
    useChat(pathname);
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  // もしマルチモーダルではないモデルが選択されていたら、マルチモーダルのモデルにする
  useEffect(() => {
    if (!MODELS.multiModalModelIds.includes(modelId)) {
      setModelId(MODELS.multiModalModelIds[0]);
    }
  }, [modelId, setModelId]);

  // TODO: query string 対応

  const startPreview = useCallback(async () => {
    try {
      if (videoElement.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoElement.current.srcObject = stream;
        videoElement.current.play();

        setMediaStream(stream);

        const interval = setInterval(() => {
          // streaming 中は処理をしない
          if (loading) {
            return;
          }

          const canvas = document.createElement('canvas');
          canvas.width = videoElement.current.videoWidth;
          canvas.height = videoElement.current.videoHeight;
          const context = canvas.getContext('2d');
          context.drawImage(
            videoElement.current,
            0,
            0,
            canvas.width,
            canvas.height
          );
          // toDataURL() で返す値は以下の形式 (;base64, 以降のみを使う)
          // ```
          // data:image/png;base64,<以下base64...>
          // ```
          const imageBase64 = canvas
            .toDataURL('image/png')
            .split(';base64,')[1];

          canvas.toBlob(async (blob) => {
            const file = new File([blob], 'tmp.png', { type: 'image/png' });
            const signedUrl = (await getSignedUrl({ mediaFormat: 'png' })).data;
            await uploadFile(signedUrl, { file });
            const baseUrl = extractBaseURL(signedUrl);
            const uploadedFiles: UploadedFileType[] = [
              {
                file,
                s3Url: baseUrl,
                base64EncodedImage: imageBase64,
              },
            ];

            postChat(
              prompter.videoAnalyzerPrompt({
                content,
              }),
              true, // 履歴は考慮しない
              undefined,
              undefined,
              undefined,
              uploadedFiles
            );
          });
        }, 10000);
        setIntervalId(interval);
      }
    } catch (e) {
      console.error('ウェブカメラにアクセスできませんでした:', e);
    }
  }, [
    videoElement,
    setIntervalId,
    content,
    loading,
    getSignedUrl,
    postChat,
    prompter,
    uploadFile,
  ]);

  const stopPreview = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (intervalId) {
      clearInterval(intervalId);
    }
  }, [mediaStream, intervalId]);

  // Callback 関数を常に最新にしておく
  useEffect(() => {
    callbackRef.current = stopPreview;
  }, [stopPreview]);

  // Unmount 時の処理
  useEffect(() => {
    return () => {
      if (callbackRef.current) {
        callbackRef.current();
        callbackRef.current = undefined;
      }
    };
  }, []);

  const shownMessages = useMemo(() => {
    return messages.reverse().filter((m) => m.role === 'assistant');
  }, [messages]);

  return (
    <div>
      <video ref={videoElement} width={640} height={480} />
      <button onClick={startPreview}>start</button>
      <button onClick={stopPreview}>stop</button>

      <Textarea
        placeholder="分析内容を指示してください"
        value={content}
        onChange={setContent}
      />

      {shownMessages.length > 0 && <div>{shownMessages[0].content}</div>}
    </div>
  );
};

export default VideoAnalyzerPage;
