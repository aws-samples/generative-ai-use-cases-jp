import { create } from 'zustand';
import { MediaFormat } from '@aws-sdk/client-transcribe';
import useTranscribeApi from './useTranscribeApi';

const useTranscribeState = create<{
  loading: boolean;
  file: File | null;
  setFile: (file: File) => void;
  transcribe: () => Promise<void>;
  jobName: string | null;
  status: string;
  setStatus: (status: string) => void;
  clear: () => void;
}>((set, get) => {
  const api = useTranscribeApi();

  const setFile = (file: File) => {
    set(() => ({
      file: file,
    }));
  };

  const setStatus = (status: string) => {
    set(() => ({
      status: status,
      loading: status === 'COMPLETED' ? false : true,
    }));
  };

  const clear = () => {
    set(() => ({
      status: '',
      jobName: null,
      file: null,
    }));
  };

  const transcribe = async () => {
    set(() => ({
      loading: true,
    }));

    const mediaFormat = get().file?.name.split('.').pop() as MediaFormat;

    // 署名付き URL の取得
    const signedUrlRes = await api.getSignedUrl({
      mediaFormat: mediaFormat,
    });
    const signedUrl = signedUrlRes.data;
    const audioUrl = signedUrl.split(/[?#]/)[0]; // 署名付き url からクエリパラメータを除外

    // 音声のアップロード
    await api.uploadAudio(signedUrl, { file: get().file! });

    // 音声認識
    const startTranscriptionRes = await api.startTranscription({
      audioUrl: audioUrl,
    });

    set(() => ({
      jobName: startTranscriptionRes.jobName,
    }));
  };

  return {
    file: null,
    loading: false,
    jobName: null,
    status: '',
    clear,
    setFile,
    transcribe,
    setStatus,
  };
});

const useTranscribe = () => {
  const {
    file,
    loading,
    jobName,
    status,
    transcribe,
    setFile,
    setStatus,
    clear,
  } = useTranscribeState();
  const { data: transcriptData } = useTranscribeApi().getTranscription(
    jobName,
    status,
    setStatus
  );
  return {
    loading,
    transcriptData,
    file,
    setFile,
    transcribe,
    clear,
  };
};
export default useTranscribe;
