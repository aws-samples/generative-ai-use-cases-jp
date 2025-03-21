import { create } from 'zustand';
import useFileApi from './useFileApi';
import { FileLimit, UploadedFileType } from 'generative-ai-use-cases-jp';
import { produce } from 'immer';
import { fileTypeFromStream } from 'file-type';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
export const extractBaseURL = (url: string) => {
  return url.split(/[?#]/)[0];
};
const useFilesState = create<{
  uploadFiles: (
    id: string,
    files: File[],
    fileLimit: FileLimit,
    accept: string[]
  ) => Promise<void>;
  checkFiles: (
    id: string,
    fileLimit: FileLimit,
    accept: string[]
  ) => Promise<void>;
  uploadedFilesDict: Record<string, UploadedFileType[]>;
  errorMessagesDict: Record<string, string[]>;
  deleteUploadedFile: (
    id: string,
    fileId: string,
    fileLimit: FileLimit,
    accept: string[]
  ) => Promise<boolean>;
  clear: (id: string) => void;
  base64Cache: Record<string, string>;
  getFileDownloadSignedUrl: (
    s3Url: string,
    cacheBase64?: boolean
  ) => Promise<string>;
}>((set, get) => {
  const api = useFileApi();

  const clear = (id: string) => {
    set((state) => ({
      uploadedFilesDict: produce(state.uploadedFilesDict, (draft) => {
        draft[id] = [];
      }),
      errorMessagesDict: produce(state.errorMessagesDict, (draft) => {
        draft[id] = [];
      }),
    }));
  };

  // Convert JS File Object to UploadedFileType to handle file upload status
  const convertFile2UploadedFileType = (file: File): UploadedFileType => {
    const getFileType = (fileType: string) => {
      if (fileType.includes('image')) return 'image';
      if (fileType.includes('video')) return 'video';
      return 'file';
    };
    const fileId = uuidv4();
    return {
      id: fileId,
      file,
      name: file.name,
      type: getFileType(file.type),
      uploading: true,
      errorMessages: [],
    } as UploadedFileType;
  };

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
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
    const updatedFiles: UploadedFileType[] = await Promise.all(
      uploadedFiles.map(async (uploadedFile, idx) => {
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
          if (fileLimit.strictImageDimensions) {
            const dimension = await getImageDimensions(uploadedFile.file);
            const isAcceptableDimension = fileLimit.strictImageDimensions.some(
              (d) => {
                return (
                  d.width === dimension.width && d.height === dimension.height
                );
              }
            );

            if (!isAcceptableDimension) {
              const humanReadableDimensions = fileLimit.strictImageDimensions
                .map((d) => `${d.width}x${d.height}`)
                .join(', ');
              errorMessages.push(
                `指定可能な画像ファイルのサイズは ${humanReadableDimensions} です (アップロードされた画像のサイズ ${dimension.width}x${dimension.height})`
              );
            }
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
      })
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
  const checkFiles = async (
    id: string,
    fileLimit: FileLimit,
    accept: string[]
  ) => {
    // Get current files
    const currentUploadedFiles = get().uploadedFilesDict[id] ?? [];

    // Get updated error messages
    const { uploadedFiles: newUploadedFiles, errorMessages } =
      await validateUploadedFiles(currentUploadedFiles, fileLimit, accept);

    set(
      produce((state) => {
        state.uploadedFilesDict[id] = newUploadedFiles;
        state.errorMessagesDict[id] = errorMessages;
      })
    );
  };

  // Handle File Uploads
  const uploadFiles = async (
    id: string,
    files: File[],
    fileLimit: FileLimit,
    accept: string[]
  ) => {
    // Get File
    const currentUploadedFiles = get().uploadedFilesDict[id] ?? [];
    const newUploadedFiles: UploadedFileType[] = [
      ...currentUploadedFiles,
      ...files.map(convertFile2UploadedFileType),
    ];

    // Validate File
    const { uploadedFiles: validatedFiles, errorMessages } =
      await validateUploadedFiles(newUploadedFiles, fileLimit, accept);

    // Update zustand to reflect current status to UI

    set(
      produce((state) => {
        state.uploadedFilesDict[id] = validatedFiles;
        state.errorMessagesDict[id] = errorMessages;
      })
    );
    // Upload File
    get().uploadedFilesDict[id].forEach((uploadedFile, idx) => {
      if (!uploadedFile.uploading) return;

      // 「画像アップロード => 署名付きURL取得 => 画像ダウンロード」だと、画像が画面に表示されるまでに時間がかかるため、
      // 選択した画像をローカルでBASE64エンコーディングし、そのまま画面に表示する（UX改善のため）
      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile.file);
      reader.onload = () => {
        set(
          produce((state) => {
            state.uploadedFilesDict[id][idx].base64EncodedData =
              reader.result?.toString();
          })
        );
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
            const currentIdx = get().uploadedFilesDict[id].findIndex(
              (file) => file.id === uploadedFile.id
            ); //アップロード中に前のファイルが削除された場合idxが変化する
            set(
              produce((state) => {
                state.uploadedFilesDict[id][currentIdx].uploading = false;
                state.uploadedFilesDict[id][currentIdx].s3Url = fileUrl;
                state.base64Cache = {
                  ...state.base64Cache,
                  [fileUrl]: reader.result?.toString() ?? '',
                };
              })
            );
          });
        });
    });
  };

  // Delete Uploaded File
  const deleteUploadedFile = async (
    id: string,
    fileId: string,
    fileLimit: FileLimit,
    accept: string[]
  ) => {
    const findTargetIndex = () =>
      get().uploadedFilesDict[id].findIndex((file) => file.id === fileId);

    let targetIndex = findTargetIndex();
    if (targetIndex > -1) {
      // "https://BUCKET_NAME.s3.REGION.amazonaws.com/FILENAME"の形式で設定されている
      const result = /https:\/\/.+\/(?<fileName>.+)/.exec(
        get().uploadedFilesDict[id][targetIndex].s3Url ?? ''
      );
      const fileName = result?.groups?.fileName;

      if (fileName) {
        // Set deleting state
        set(
          produce((state) => {
            state.uploadedFilesDict[id][targetIndex].deleting = true;
          })
        );

        await api.deleteUploadedFile(fileName);

        // 削除処理中に他の画像も削除された場合に、Indexがズレるため再取得する
        targetIndex = findTargetIndex();
        set(
          produce((state) => {
            state.uploadedFilesDict[id].splice(targetIndex, 1);
          })
        );

        // Refresh error messages
        await checkFiles(id, fileLimit, accept);

        return true;
      }
    }
    return false;
  };

  // getFileDownloadSignedUrl を useFileApi から移動し、Base64 キャッシュ機能を追加
  const getFileDownloadSignedUrl = async (
    s3Url: string,
    cacheBase64?: boolean
  ) => {
    const url = await api.getFileDownloadSignedUrl(s3Url);

    // Base64 キャッシュが要求された場合
    if (cacheBase64) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();

        const base64Data = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        // キャッシュを更新
        set((state) => ({
          base64Cache: {
            ...state.base64Cache,
            [s3Url]: base64Data,
          },
        }));
      } catch (error) {
        console.error('Failed to cache base64 data:', error);
      }
    }

    return url;
  };

  return {
    clear,
    uploadedFilesDict: {},
    errorMessagesDict: {},
    uploadFiles,
    checkFiles,
    deleteUploadedFile,
    base64Cache: {},
    getFileDownloadSignedUrl,
  };
});

const useFiles = (id: string) => {
  const {
    uploadFiles,
    checkFiles,
    clear,
    uploadedFilesDict,
    deleteUploadedFile,
    errorMessagesDict,
    base64Cache,
    getFileDownloadSignedUrl,
  } = useFilesState();
  return {
    uploadFiles: (files: File[], fileLimit: FileLimit, accept: string[]) =>
      uploadFiles(id, files, fileLimit, accept),
    checkFiles: useCallback(
      (fileLimit: FileLimit, accept: string[]) =>
        checkFiles(id, fileLimit, accept),
      [checkFiles, id]
    ),
    errorMessages: errorMessagesDict[id] ?? [],
    clear: () => clear(id),
    uploadedFiles: uploadedFilesDict[id] ?? [],
    deleteUploadedFile: (
      fileId: string,
      fileLimit: FileLimit,
      accept: string[]
    ) => deleteUploadedFile(id, fileId, fileLimit, accept),
    uploading:
      uploadedFilesDict[id]?.some((uploadedFile) => uploadedFile.uploading) ??
      false,
    base64Cache,
    getFileDownloadSignedUrl,
  };
};
export default useFiles;
