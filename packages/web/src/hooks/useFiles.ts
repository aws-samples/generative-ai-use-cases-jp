import { create } from 'zustand';
import useFileApi from './useFileApi';
import { ExtraData } from 'generative-ai-use-cases-jp';
import { produce } from 'immer';

const extractBaseURL = (url: string) => {
  return url.split(/[?#]/)[0];
};

const useFilesState = create<{
  loading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
  uploadedFiles: ExtraData[];
  deleteUploadedFile: (fileUrl: string) => Promise<boolean>;
  clear: () => void;
}>((set, get) => {
  const api = useFileApi();

  const clear = () => {
    set(() => ({
      uploadedFiles: [],
    }));
  };

  const uploadFiles = async (files: File[]) => {
    set(() => ({
      loading: true,
    }));

    const fileUrls = files
      ? await Promise.all(
          files.map(async (file) => {
            const mediaFormat = file.name.split('.').pop() as string;

            // 署名付き URL の取得
            const signedUrlRes = await api.getSignedUrl({
              mediaFormat: mediaFormat,
            });
            const signedUrl = signedUrlRes.data;
            const fileUrl = extractBaseURL(signedUrl); // 署名付き url からクエリパラメータを除外

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
      uploadedFiles: produce(get().uploadedFiles, (draft) => {
        draft.push(...fileUrls);
      }),
    }));
  };

  const deleteUploadedFile = async (fileUrl: string) => {
    const baseUrl = extractBaseURL(fileUrl);
    const findTargetIndex = () =>
      get().uploadedFiles.findIndex((file) => file.source.data === baseUrl);
    let targetIndex = findTargetIndex();

    if (targetIndex > -1) {
      // "https://BUCKET_NAME.s3.REGION.amazonaws.com/FILENAME"の形式で設定されている
      const result = /https:\/\/.+\/(?<fileName>.+)/.exec(
        get().uploadedFiles[targetIndex].source.data
      );
      const fileName = result?.groups?.fileName;

      if (fileName) {
        await api.deleteUploadedFile(fileName);

        // 削除処理中に他の画像も削除された場合に、Indexがズレるため再取得s
        targetIndex = findTargetIndex();

        set({
          uploadedFiles: produce(get().uploadedFiles, (draft) => {
            draft.splice(targetIndex, 1);
          }),
        });
        return true;
      }
    }
    return false;
  };

  return {
    loading: false,
    clear,
    uploadedFiles: [],
    uploadFiles,
    deleteUploadedFile,
  };
});

const useFiles = () => {
  const { loading, uploadFiles, clear, uploadedFiles, deleteUploadedFile } =
    useFilesState();
  return {
    loading,
    uploadFiles,
    clear,
    uploadedFiles,
    deleteUploadedFile,
  };
};
export default useFiles;
