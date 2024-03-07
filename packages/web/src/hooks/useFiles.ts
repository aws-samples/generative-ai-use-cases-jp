import { create } from 'zustand';
import useFileApi from './useFileApi';
import { ExtraData } from 'generative-ai-use-cases-jp';

const useFilesState = create<{
  loading: boolean;
  files: File[] | null;
  setFiles: (files: File[]) => void;
  uploadFiles: () => Promise<void>;
  uploadedFiles: ExtraData[];
  clear: () => void;
}>((set, get) => {
  const api = useFileApi();

  const setFiles = (files: File[]) => {
    set(() => ({
      files: files,
    }));
  };

  const clear = () => {
    set(() => ({
      files: [],
      uploadedFiles: [],
    }));
  };

  const uploadFiles = async () => {
    set(() => ({
      loading: true,
      uploadedFiles: [],
    }));

    const files = get().files;

    const fileUrls = files
      ? await Promise.all(
          files.map(async (file) => {
            const mediaFormat = file.name.split('.').pop() as string;

            // 署名付き URL の取得
            const signedUrlRes = await api.getSignedUrl({
              mediaFormat: mediaFormat,
            });
            const signedUrl = signedUrlRes.data;
            const fileUrl = signedUrl.split(/[?#]/)[0]; // 署名付き url からクエリパラメータを除外

            // ファイルのアップロード
            await api.uploadFile(signedUrl, { file: file });
            return {
              type: 'image',
              source: {
                type: 's3',
                mediaType: file.type,
                data: fileUrl,
              },
            };
          })
        )
      : [];

    set(() => ({
      uploadedFiles: fileUrls,
    }));
  };

  return {
    files: null,
    loading: false,
    clear,
    setFiles,
    uploadedFiles: [],
    uploadFiles,
  };
});

const useFiles = () => {
  const { files, loading, uploadFiles, clear, setFiles, uploadedFiles } =
    useFilesState();
  return {
    files,
    loading,
    uploadFiles,
    clear,
    setFiles,
    uploadedFiles,
  };
};
export default useFiles;
