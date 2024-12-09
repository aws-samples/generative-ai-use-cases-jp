import { create } from 'zustand';
import useFileApi from './useFileApi';
import { FileLimit, UploadedFileType } from 'generative-ai-use-cases-jp';
import { produce } from 'immer';
import { fileTypeFromStream } from 'file-type';

export const extractBaseURL = (url: string) => {
  return url.split(/[?#]/)[0];
};
const useFilesState = create<{
  uploadFiles: (
    files: File[],
    fileLimit: FileLimit,
    accept: string[]
  ) => Promise<void>;
  checkFiles: (fileLimit: FileLimit, accept: string[]) => Promise<void>;
  uploadedFiles: UploadedFileType[];
  errorMessages: string[];
  deleteUploadedFile: (
    fileUrl: string,
    fileLimit: FileLimit,
    accept: string[]
  ) => Promise<boolean>;
  clear: () => void;
}>((set, get) => {
  const api = useFileApi();

  const clear = () => {
    set(() => ({
      errorMessages: [],
      uploadedFiles: [],
    }));
  };

  // Convert JS File Object to UploadedFileType to handle file upload status
  const convertFile2UploadedFileType = (file: File): UploadedFileType => {
    const getFileType = (fileType: string) => {
      if (fileType.includes('image')) return 'image';
      if (fileType.includes('video')) return 'video';
      return 'file';
    };
    return {
      file,
      name: file.name,
      type: getFileType(file.type),
      uploading: true,
      errorMessages: [],
    } as UploadedFileType;
  };

  // Validated given uploadedFiles, return updated uploadedFiles (no side effect) and errorMessages
  const validateUploadedFiles = async (
    uploadedFiles: UploadedFileType[],
    fileLimit: FileLimit,
    accept: string[]
  ) => {
    let fileCount = 0;
    let imageFileCount = 0;
    let videoFileCount = 0;

    // filter は非同期関数が利用できないため先に評価を行う
    const isMimeSpoofedResults = await Promise.all(
      uploadedFiles.map(async (uploadedFile) => {
        // file.type は拡張子ベースで MIME を取得する一方、fileTypeFromStream はファイルヘッダの Signature を確認する
        const realMimeType = (
          await fileTypeFromStream(uploadedFile.file.stream())
        )?.mime;
        // exception when file is doc or xls
        const isDocOrXls =
          ['application/msword', 'application/vnd.ms-excel'].includes(
            uploadedFile.file.type || ''
          ) && realMimeType === 'application/x-cfb';
        const isMimeSpoofed =
          uploadedFile.file.type &&
          realMimeType &&
          uploadedFile.file.type != realMimeType &&
          !isDocOrXls;
        return isMimeSpoofed;
      })
    );

    // アップロードされたファイルの検証
    const updatedFiles: UploadedFileType[] = uploadedFiles.map(
      (uploadedFile, idx) => {
        const errorMessages: string[] = [];

        // ファイルの拡張子が間違っている場合はフィルタリング
        if (isMimeSpoofedResults[idx]) {
          errorMessages.push(
            `${uploadedFile.file.name} はファイルタイプと拡張子が合致しないファイルです。`
          );
        }

        // 許可されたファイルタイプをフィルタリング
        const mediaFormat = ('.' +
          uploadedFile.file.name.split('.').pop()) as string;
        const isFileTypeAllowed = accept.includes(mediaFormat);
        if (accept && accept.length === 0) {
          errorMessages.push(`このモデルはファイルに対応していません。`);
        } else if (!isFileTypeAllowed) {
          errorMessages.push(
            `${uploadedFile.file.name} は許可されていない拡張子です。利用できる拡張子は ${accept.join(', ')} です`
          );
        }

        // ファイルサイズによるフィルタリング
        const getMaxFileSizeMB = (fileType: string) => {
          if (fileType.includes('image')) return fileLimit.maxImageFileSizeMB;
          if (fileType.includes('video')) return fileLimit.maxVideoFileSizeMB;
          return fileLimit.maxFileSizeMB;
        };
        const maxSizeMB = getMaxFileSizeMB(uploadedFile.file.type) || 0;
        const isFileSizeAllowed = uploadedFile.file.size <= maxSizeMB * 1e6;
        if (!isFileSizeAllowed) {
          errorMessages.push(
            `${uploadedFile.file.name} は最大ファイルサイズ ${maxSizeMB} MB を超えています。`
          );
        }

        // ファイル数によるフィルタリング
        let isFileNumberAllowed = false;
        if (uploadedFile.file.type.includes('image')) {
          imageFileCount += 1;
          isFileNumberAllowed =
            imageFileCount <= (fileLimit.maxImageFileCount || 0);
          if (!isFileNumberAllowed) {
            errorMessages.push(
              `画像ファイルは ${fileLimit.maxImageFileCount} 個以下にしてください`
            );
          }
        } else if (uploadedFile.file.type.includes('video')) {
          videoFileCount += 1;
          isFileNumberAllowed =
            videoFileCount <= (fileLimit.maxVideoFileCount || 0);
          if (!isFileNumberAllowed) {
            errorMessages.push(
              `動画ファイルは ${fileLimit.maxVideoFileCount} 個以下にしてください`
            );
          }
        } else {
          fileCount += 1;
          isFileNumberAllowed = fileCount <= (fileLimit.maxFileCount || 0);
          if (!isFileNumberAllowed) {
            errorMessages.push(
              `ファイルは ${fileLimit.maxFileCount} 個以下にしてください`
            );
          }
        }

        return {
          ...uploadedFile,
          errorMessages: errorMessages,
        } as UploadedFileType;
      }
    );

    return {
      uploadedFiles: updatedFiles,
      errorMessages: [
        ...new Set(
          updatedFiles.flatMap((uploadedFile) => uploadedFile.errorMessages)
        ),
      ],
    };
  };

  // Refresh error messages
  const checkFiles = async (fileLimit: FileLimit, accept: string[]) => {
    // Get current files
    const currentUploadedFiles = get().uploadedFiles;

    // Get updated error messages
    const { uploadedFiles: newUploadedFiles, errorMessages } =
      await validateUploadedFiles(currentUploadedFiles, fileLimit, accept);

    // Update Files using immer
    set((state) =>
      produce(state, (draft) => {
        draft.uploadedFiles = newUploadedFiles;
        draft.errorMessages = errorMessages;
      })
    );
  };

  // Handle File Uploads
  const uploadFiles = async (
    files: File[],
    fileLimit: FileLimit,
    accept: string[]
  ) => {
    // Get File
    const currentUploadedFiles = get().uploadedFiles;
    const newUploadedFiles: UploadedFileType[] = [
      ...currentUploadedFiles,
      ...files.map(convertFile2UploadedFileType),
    ];

    // Validate File
    const { uploadedFiles: validatedFiles, errorMessages } =
      await validateUploadedFiles(newUploadedFiles, fileLimit, accept);

    // Update zustand to reflect current status to UI
    set(() => ({
      uploadedFiles: validatedFiles,
      errorMessages: errorMessages,
    }));

    // Upload File
    get().uploadedFiles.forEach((uploadedFile, idx) => {
      if (!uploadedFile.uploading) return;

      // 「画像アップロード => 署名付きURL取得 => 画像ダウンロード」だと、画像が画面に表示されるまでに時間がかかるため、
      // 選択した画像をローカルでBASE64エンコーディングし、そのまま画面に表示する（UX改善のため）
      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile.file);
      reader.onload = () => {
        set(() => ({
          uploadedFiles: produce(get().uploadedFiles, (draft) => {
            draft[idx].base64EncodedData = reader.result?.toString();
          }),
        }));
      };

      const mediaFormat = uploadedFile.file.name.split('.').pop() as string;

      // 署名付き URL の取得（並列実行させるために、await せずに実行）
      api
        .getSignedUrl({
          filename: uploadedFile.file.name,
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

  // Delete Uploaded File
  const deleteUploadedFile = async (
    fileUrl: string,
    fileLimit: FileLimit,
    accept: string[]
  ) => {
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
        // Set deleting state
        set((state) =>
          produce(state, (draft) => {
            draft.uploadedFiles[targetIndex].deleting = true;
          })
        );

        await api.deleteUploadedFile(fileName);

        // 削除処理中に他の画像も削除された場合に、Indexがズレるため再取得する
        targetIndex = findTargetIndex();
        set((state) =>
          produce(state, (draft) => {
            draft.uploadedFiles.splice(targetIndex, 1);
          })
        );

        // Refresh error messages
        await checkFiles(fileLimit, accept);

        return true;
      }
    }
    return false;
  };

  return {
    clear,
    uploadedFiles: [],
    errorMessages: [],
    uploadFiles,
    checkFiles,
    deleteUploadedFile,
  };
});

const useFiles = () => {
  const {
    uploadFiles,
    checkFiles,
    clear,
    uploadedFiles,
    deleteUploadedFile,
    errorMessages,
  } = useFilesState();
  return {
    uploadFiles,
    checkFiles,
    errorMessages,
    clear,
    uploadedFiles: uploadedFiles,
    deleteUploadedFile,
    uploading: uploadedFiles.some((uploadedFile) => uploadedFile.uploading),
  };
};
export default useFiles;
