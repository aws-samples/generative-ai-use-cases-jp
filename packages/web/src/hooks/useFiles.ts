import { create } from 'zustand';
import useFileApi from './useFileApi';
import { UploadedFileType } from 'generative-ai-use-cases-jp';
import { produce } from 'immer';

export const extractBaseURL = (url: string) => {
  return url.split(/[?#]/)[0];
};
const useFilesState = create<{
  uploadFiles: (files: File[]) => Promise<void>;
  uploadedFiles: UploadedFileType[];
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
    const uploadedFiles: UploadedFileType[] = files
      .filter((file) => {
        // 画像ファイルのみ許可
        const pattern = /^image\/(jpeg|png|gif|webp)/;
        return file.type.match(pattern);
      })
      .map((file) => ({
        file,
        uploading: true,
      }));

    set(() => ({
      uploadedFiles: produce(get().uploadedFiles, (draft) => {
        draft.push(...uploadedFiles);
      }),
    }));

    get().uploadedFiles.forEach((uploadedFile, idx) => {
      // 「画像アップロード => 署名付きURL取得 => 画像ダウンロード」だと、画像が画面に表示されるまでに時間がかかるため、
      // 選択した画像をローカルでBASE64エンコーディングし、そのまま画面に表示する（UX改善のため）
      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile.file);
      reader.onload = () => {
        set(() => ({
          uploadedFiles: produce(get().uploadedFiles, (draft) => {
            draft[idx].base64EncodedImage = reader.result?.toString();
          }),
        }));
      };

      const mediaFormat = uploadedFile.file.name.split('.').pop() as string;

      // 署名付き URL の取得（並列実行させるために、await せずに実行）
      api
        .getSignedUrl({
          mediaFormat: mediaFormat,
        })
        .then(async (signedUrlRes) => {
          const signedUrl = signedUrlRes.data;
          const fileUrl = extractBaseURL(signedUrl); // 署名付き url からクエリパラメータを除外
          // ファイルのアップロード
          api.uploadFile(signedUrl, { file: uploadedFile.file }).then(() => {
            set({
              uploadedFiles: produce(get().uploadedFiles, (draft) => {
                draft[idx].uploading = false;
                draft[idx].s3Url = fileUrl;
              }),
            });
          });
        });
    });
  };

  const deleteUploadedFile = async (fileUrl: string) => {
    const baseUrl = extractBaseURL(fileUrl);
    const findTargetIndex = () =>
      get().uploadedFiles.findIndex((file) => file.s3Url === baseUrl);
    let targetIndex = findTargetIndex();

    if (targetIndex > -1) {
      // "https://BUCKET_NAME.s3.REGION.amazonaws.com/FILENAME"の形式で設定されている
      const result = /https:\/\/.+\/(?<fileName>.+)/.exec(
        get().uploadedFiles[targetIndex].s3Url ?? ''
      );
      const fileName = result?.groups?.fileName;

      if (fileName) {
        set({
          uploadedFiles: produce(get().uploadedFiles, (draft) => {
            draft[targetIndex].deleting = true;
          }),
        });

        await api.deleteUploadedFile(fileName);

        // 削除処理中に他の画像も削除された場合に、Indexがズレるため再取得する
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
    clear,
    uploadedFiles: [],
    uploadFiles,
    deleteUploadedFile,
  };
});

const useFiles = () => {
  const { uploadFiles, clear, uploadedFiles, deleteUploadedFile } =
    useFilesState();
  return {
    uploadFiles,
    clear,
    uploadedFiles: uploadedFiles.filter((file) => !file.deleting),
    deleteUploadedFile,
    uploading: uploadedFiles.some((uploadedFile) => uploadedFile.uploading),
  };
};
export default useFiles;
