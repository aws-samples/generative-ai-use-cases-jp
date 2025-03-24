import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { VideoJob, GenerateVideoParams } from 'generative-ai-use-cases-jp';
import { create } from 'zustand';
import useVideo from '../hooks/useVideo';
import { MODELS } from '../hooks/useModel';
import useFileApi from '../hooks/useFileApi';
import useFiles from '../hooks/useFiles';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import RangeSlider from '../components/RangeSlider';
import Switch from '../components/Switch';
import ButtonIcon from '../components/ButtonIcon';
import Button from '../components/Button';
import ButtonCopy from '../components/ButtonCopy';
import Card from '../components/Card';
import ZoomUpImage from '../components/ZoomUpImage';
import {
  PiPlayFill,
  PiDownload,
  PiSpinnerGap,
  PiArrowClockwise,
  PiTrash,
  PiUpload,
} from 'react-icons/pi';
import { GenerateVideoPageQueryParams } from '../@types/navigate';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODEL_PARAMS: Record<string, any> = {
  'amazon.nova-reel-v1:0': {
    dimension: ['1280x720'],
    durationSeconds: [6],
    fps: [24],
    seed: 0,
    // type of the images below: FileLimit & { label: string }
    images: {
      label: '動画の 1 フレーム目に使われる画像を指定できます',
      accept: {
        image: ['.jpg', '.jpeg', '.png'],
      },
      maxImageFileCount: 1,
      maxImageFileSizeMB: 10,
      strictImageDimensions: [{ width: 1280, height: 720 }],
    },
  },
  'luma.ray-v2:0': {
    resolution: ['540p', '720p'],
    durationSeconds: [5, 9],
    aspectRatio: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'],
    loop: false,
  },
};

type StateType = Omit<Required<GenerateVideoParams>, 'images'> & {
  videoGenModelId: string;
  setVideoGenModelId: (s: string) => void;
  setPrompt: (s: string) => void;
  setDimension: (s: string) => void;
  setDurationSeconds: (n: number) => void;
  setFps: (n: number) => void;
  setSeed: (n: number) => void;
  setResolution: (s: string) => void;
  setAspectRatio: (s: string) => void;
  setLoop: (b: boolean) => void;
  clear: () => void;
};

const useGenerateVideoPageState = create<StateType>((set) => {
  const INIT_STATE = {
    videoGenModelId: '',
    prompt: '',
    dimension: '',
    durationSeconds: 0,
    fps: 0,
    seed: 0,
    resolution: '',
    aspectRatio: '',
    loop: false,
  };
  return {
    ...INIT_STATE,
    setVideoGenModelId: (s: string) => {
      set(() => ({
        videoGenModelId: s,
      }));
    },
    setPrompt: (s: string) => {
      set(() => ({
        prompt: s,
      }));
    },
    setDimension: (s: string) => {
      set(() => ({
        dimension: s,
      }));
    },
    setDurationSeconds: (n: number) => {
      set(() => ({
        durationSeconds: n,
      }));
    },
    setFps: (n: number) => {
      set(() => ({
        fps: n,
      }));
    },
    setSeed: (n: number) => {
      set(() => ({
        seed: n,
      }));
    },
    setResolution: (s: string) => {
      set(() => ({
        resolution: s,
      }));
    },
    setAspectRatio: (s: string) => {
      set(() => ({
        aspectRatio: s,
      }));
    },
    setLoop: (b: boolean) => {
      set(() => ({
        loop: b,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const GenerateVideoPage: React.FC = () => {
  const {
    videoGenModelId,
    setVideoGenModelId,
    prompt,
    setPrompt,
    dimension,
    setDimension,
    durationSeconds,
    setDurationSeconds,
    fps,
    setFps,
    seed,
    setSeed,
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
    loop,
    setLoop,
    clear,
  } = useGenerateVideoPageState();
  const { pathname, search } = useLocation();
  const {
    generate,
    videoJobs,
    mutateVideoJobs,
    canLoadMoreVideoJobs,
    loadMoreVideoJobs,
    isLoadingVideoJobs,
    isValidatingVideoJobs,
    deleteVideoJob: deleteVideoJobInner,
  } = useVideo();
  const {
    uploadFiles,
    uploadedFiles,
    deleteUploadedFile,
    errorMessages,
    clear: clearFiles,
  } = useFiles(pathname);
  const { videoGenModelIds, videoGenModels } = MODELS;
  const { getFileDownloadSignedUrl } = useFileApi();
  const [previewVideoSrc, setPreviewVideoSrc] = useState('');
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingJobIds, setDownloadingJobIds] = useState<
    Record<string, boolean>
  >({});
  const [deletingJobIds, setDeletingJobIds] = useState<Record<string, boolean>>(
    {}
  );

  const onChangeFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      const fileLimit = MODEL_PARAMS[videoGenModelId]!.images;
      const accept =
        MODEL_PARAMS[videoGenModelId].images?.accept?.image?.join(',');

      if (files) {
        // ファイルを反映しアップロード
        uploadFiles(Array.from(files), fileLimit, accept);
      }
    },
    [videoGenModelId, uploadFiles]
  );

  useEffect(() => {
    const _modelId =
      videoGenModelId === '' ? videoGenModelIds[0] : videoGenModelId;

    if (search !== '') {
      const params = queryString.parse(search) as GenerateVideoPageQueryParams;
      setPrompt(params.prompt ?? '');
      setVideoGenModelId(
        videoGenModelIds.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setVideoGenModelId(_modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoGenModelId, videoGenModelIds, search, setPrompt]);

  useEffect(() => {
    if (videoGenModelId === '') {
      setVideoGenModelId(videoGenModelIds[0]);
    } else {
      if (MODEL_PARAMS[videoGenModelId].dimension) {
        setDimension(MODEL_PARAMS[videoGenModelId].dimension[0]);
      }

      if (MODEL_PARAMS[videoGenModelId].durationSeconds) {
        setDurationSeconds(MODEL_PARAMS[videoGenModelId].durationSeconds[0]!);
      }

      if (MODEL_PARAMS[videoGenModelId].fps) {
        setFps(MODEL_PARAMS[videoGenModelId].fps[0]!);
      }

      if (MODEL_PARAMS[videoGenModelId].seed !== undefined) {
        setSeed(MODEL_PARAMS[videoGenModelId].seed);
      }

      if (MODEL_PARAMS[videoGenModelId].resolution) {
        setResolution(MODEL_PARAMS[videoGenModelId].resolution[0]!);
      }

      if (MODEL_PARAMS[videoGenModelId].aspectRatio) {
        setAspectRatio(MODEL_PARAMS[videoGenModelId].aspectRatio[0]!);
      }

      if (MODEL_PARAMS[videoGenModelId].loop !== undefined) {
        setLoop(MODEL_PARAMS[videoGenModelId].loop);
      }
    }
  }, [
    videoGenModelId,
    setVideoGenModelId,
    setDimension,
    setDurationSeconds,
    setFps,
    setSeed,
    setResolution,
    setAspectRatio,
    setLoop,
    videoGenModelIds,
  ]);

  const generateVideo = useCallback(async () => {
    setIsGenerating(true);

    try {
      const params: GenerateVideoParams = {
        prompt,
        durationSeconds,
        dimension,
        fps,
        seed,
        resolution,
        aspectRatio,
        loop,
        images:
          MODEL_PARAMS[videoGenModelId].images && uploadedFiles.length > 0
            ? uploadedFiles.map((f) => {
                return {
                  format: f.base64EncodedData!.includes('data:image/png')
                    ? 'png'
                    : 'jpeg',
                  source: {
                    bytes: f.base64EncodedData!.split(';base64,')[1],
                  },
                };
              })
            : undefined,
      };

      console.log(params);

      await generate(
        params,
        videoGenModels.find((m) => m.modelId === videoGenModelId)
      );

      mutateVideoJobs();

      toast.info(
        '動画生成ジョブを開始しました。生成中にページを離脱しても問題ありません。'
      );
    } catch (e) {
      console.error(e);
      toast.error(`動画生成に失敗しました (${e})`, {
        duration: 30000,
        closeButton: true,
      });
    }

    setIsGenerating(false);
  }, [
    generate,
    prompt,
    durationSeconds,
    fps,
    dimension,
    seed,
    resolution,
    aspectRatio,
    loop,
    videoGenModels,
    videoGenModelId,
    mutateVideoJobs,
    setIsGenerating,
    uploadedFiles,
  ]);

  const setPreview = useCallback(
    async (job: VideoJob) => {
      setPreviewPrompt(job.prompt);
      const signedUrl = await getFileDownloadSignedUrl(job.output);
      setPreviewVideoSrc(signedUrl);
    },
    [setPreviewPrompt, getFileDownloadSignedUrl, setPreviewVideoSrc]
  );

  const downloadFile = useCallback(
    async (job: VideoJob) => {
      setDownloadingJobIds({ ...downloadingJobIds, [job.createdDate]: true });
      const signedUrl = await getFileDownloadSignedUrl(job.output);
      const res = await fetch(signedUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video_${job.jobId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadingJobIds({ ...downloadingJobIds, [job.createdDate]: false });
    },
    [setDownloadingJobIds, downloadingJobIds, getFileDownloadSignedUrl]
  );

  const deleteVideoJob = useCallback(
    async (job: VideoJob) => {
      setDeletingJobIds({ ...deletingJobIds, [job.createdDate]: true });
      await deleteVideoJobInner(job);
      mutateVideoJobs();
      setDeletingJobIds({ ...deletingJobIds, [job.createdDate]: false });
    },
    [deleteVideoJobInner, mutateVideoJobs, deletingJobIds, setDeletingJobIds]
  );

  const disabledExec = useMemo(() => {
    return prompt.length === 0 || isGenerating || errorMessages.length > 0;
  }, [prompt, isGenerating, errorMessages]);

  const clearable = useMemo(() => {
    return (prompt.length > 0 || uploadedFiles.length > 0) && !isGenerating;
  }, [prompt, isGenerating, uploadedFiles]);

  const formatDate = useCallback((createdDate: string) => {
    const date = new Date(Number(createdDate));
    return date.toLocaleString();
  }, []);

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <div className="col-span-12 lg:col-span-4">
        <Card>
          <Select
            label="モデル"
            value={videoGenModelId}
            onChange={setVideoGenModelId}
            options={videoGenModelIds.map((m) => {
              return { value: m, label: m };
            })}
            fullWidth
          />

          {MODEL_PARAMS[videoGenModelId] && (
            <>
              <Textarea
                value={prompt}
                onChange={setPrompt}
                label="プロンプト"
                placeholder="Kids are playing with many balls"
                rows={3}
                required
              />

              {MODEL_PARAMS[videoGenModelId].dimension && (
                <Select
                  label="画面サイズ"
                  value={dimension}
                  onChange={setDimension}
                  options={MODEL_PARAMS[videoGenModelId].dimension.map(
                    (m: string) => {
                      return { value: m, label: m };
                    }
                  )}
                  fullWidth
                />
              )}

              {MODEL_PARAMS[videoGenModelId].resolution && (
                <Select
                  label="解像度"
                  value={resolution}
                  onChange={setResolution}
                  options={MODEL_PARAMS[videoGenModelId].resolution.map(
                    (m: string) => {
                      return { value: m, label: m };
                    }
                  )}
                  fullWidth
                />
              )}

              {MODEL_PARAMS[videoGenModelId].aspectRatio && (
                <Select
                  label="アスペクト比"
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  options={MODEL_PARAMS[videoGenModelId].aspectRatio.map(
                    (m: string) => {
                      return { value: m, label: m };
                    }
                  )}
                  fullWidth
                />
              )}

              {MODEL_PARAMS[videoGenModelId].durationSeconds && (
                <Select
                  label="動画長 (秒)"
                  value={`${durationSeconds}`}
                  onChange={(n: string) => {
                    setDurationSeconds(Number(n));
                  }}
                  options={MODEL_PARAMS[videoGenModelId].durationSeconds.map(
                    (m: number) => {
                      return { value: `${m}`, label: `${m}` };
                    }
                  )}
                  fullWidth
                />
              )}

              {MODEL_PARAMS[videoGenModelId].fps && (
                <Select
                  label="FPS"
                  value={`${fps}`}
                  onChange={(n: string) => {
                    setFps(Number(n));
                  }}
                  options={MODEL_PARAMS[videoGenModelId].fps.map(
                    (m: number) => {
                      return { value: `${m}`, label: `${m}` };
                    }
                  )}
                  fullWidth
                />
              )}

              {MODEL_PARAMS[videoGenModelId].seed !== undefined && (
                <RangeSlider
                  className="w-full"
                  label="Seed"
                  min={0}
                  max={2147483646}
                  value={seed}
                  onChange={(n) => {
                    setSeed(n);
                  }}
                  help="乱数のシード値です。同じシード値を指定すると同じ動画が生成されます。"
                />
              )}

              {MODEL_PARAMS[videoGenModelId].loop !== undefined && (
                <Switch
                  className="w-full"
                  label="ループ"
                  checked={loop}
                  onSwitch={(l) => {
                    setLoop(l);
                  }}
                />
              )}

              {MODEL_PARAMS[videoGenModelId]!.images && (
                <div>
                  <div className="text-sm">画像アップロード</div>

                  {/* 現状 <input multiple/> である必要はないですが、今後の拡張性も見て multiple にしています*/}
                  <label>
                    <input
                      hidden
                      onChange={onChangeFiles}
                      type="file"
                      accept={MODEL_PARAMS[
                        videoGenModelId
                      ]!.images!.accept.image.join(',')}
                      multiple
                      value={[]}
                    />
                    <div className="text-aws-smile border-aws-smile my-2 flex w-full cursor-pointer flex-row items-center justify-center rounded-full border-2 bg-white p-1 text-sm hover:bg-gray-100">
                      <PiUpload className="mr-1 text-base" /> アップロード
                    </div>
                  </label>

                  <p className="my-1 text-xs">
                    {MODEL_PARAMS[videoGenModelId]!.images!.label}
                  </p>

                  <p className="my-1 text-xs text-gray-400">
                    サポートされている拡張子:{' '}
                    {MODEL_PARAMS[videoGenModelId]!.images!.accept.image.join(
                      ' '
                    )}
                  </p>

                  {MODEL_PARAMS[videoGenModelId]!.images!
                    .strictImageDimensions && (
                    <p className="my-1 text-xs text-gray-400">
                      サポートされている画像サイズ:{' '}
                      {MODEL_PARAMS[
                        videoGenModelId
                      ]!.images!.strictImageDimensions.map(
                        (d: { width: number; height: number }) =>
                          `${d.width}x${d.height}`
                      ).join(', ')}
                    </p>
                  )}

                  {errorMessages.length > 0 && (
                    <div>
                      {errorMessages.map((errorMessage, idx) => (
                        <p key={idx} className="text-red-500">
                          {errorMessage}
                        </p>
                      ))}
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((uploadedFile, idx) => {
                        return (
                          <ZoomUpImage
                            key={idx}
                            src={uploadedFile.base64EncodedData}
                            loading={uploadedFile.uploading}
                            deleting={uploadedFile.deleting}
                            size="s"
                            error={uploadedFile.errorMessages.length > 0}
                            onDelete={() => {
                              deleteUploadedFile(
                                uploadedFile.id ?? '',
                                MODEL_PARAMS[videoGenModelId]!.images!,
                                MODEL_PARAMS[videoGenModelId]!.images!.accept
                                  .image
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex flex-row items-center gap-x-5">
            <Button
              className="h-8 w-full"
              disabled={disabledExec}
              onClick={generateVideo}
              loading={isGenerating}>
              生成
            </Button>
            <Button
              className="h-8 w-full"
              outlined
              onClick={() => {
                clear();
                clearFiles();
              }}
              disabled={!clearable}>
              クリア
            </Button>
          </div>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-8">
        <Card className="lg:min-h-[calc(100vh-2rem)]">
          <div className="flex flex-col items-center justify-center gap-y-4">
            {previewVideoSrc.length > 0 ? (
              <video
                className="w-128 h-72 max-w-full"
                src={previewVideoSrc}
                autoPlay
                loop
                controls
              />
            ) : (
              <div className="w-128 relative h-72 max-w-full border">
                <div className="absolute inset-0 flex items-center justify-center">
                  <PiPlayFill className="h-32 w-32 text-gray-200" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  再生ボタンを押してください
                </div>
              </div>
            )}

            <div className="w-128 relative h-24 max-w-full border p-2">
              {previewPrompt.length > 0 ? (
                <div className="h-full w-full overflow-y-scroll">
                  <ButtonCopy
                    className="absolute bottom-1 right-1"
                    text={previewPrompt}
                  />
                  {previewPrompt}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  プロンプトはここに表示されます
                </div>
              )}
            </div>
          </div>

          <div className="mb-1 mt-4 flex flex-row items-center gap-x-1 text-sm">
            ジョブ一覧
            <ButtonIcon
              loading={isValidatingVideoJobs}
              onClick={mutateVideoJobs}
              className="h-8 w-8">
              <PiArrowClockwise className="text-base" />
            </ButtonIcon>
          </div>

          <div className="w-full overflow-x-auto border sm:rounded-lg">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full min-w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs">
                  <tr>
                    <th
                      scope="col"
                      className="min-w-12 bg-gray-50 px-6 py-3"
                      align="center">
                      再生
                    </th>
                    <th
                      scope="col"
                      className="min-w-32 bg-gray-50 px-6 py-3"
                      align="left">
                      ステータス
                    </th>
                    <th
                      scope="col"
                      className="min-w-48 bg-gray-50 px-6 py-3"
                      align="center">
                      プロンプト
                    </th>
                    <th
                      scope="col"
                      className="min-w-48 bg-gray-50 px-6 py-3"
                      align="center">
                      モデル
                    </th>
                    <th
                      scope="col"
                      className="min-w-48 bg-gray-50 px-6 py-3"
                      align="center">
                      日時
                    </th>
                    <th
                      scope="col"
                      className="min-w-32 bg-gray-50 px-6 py-3"
                      align="center">
                      ダウンロード
                    </th>
                    <th
                      scope="col"
                      className="min-w-12 bg-gray-50 px-6 py-3"
                      align="center">
                      削除
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videoJobs.map((job, idx) => {
                    return (
                      <tr
                        key={idx}
                        className="border-b bg-white hover:bg-gray-50">
                        <td
                          className="whitespace-nowrap px-6 py-4"
                          align="center">
                          <ButtonIcon
                            onClick={() => {
                              setPreview(job);
                            }}
                            disabled={job.status === 'InProgress'}>
                            <PiPlayFill className="text-aws-smile" />
                          </ButtonIcon>
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4"
                          align="center">
                          {job.status}
                        </td>
                        <td
                          className="max-w-64 whitespace-nowrap px-6 py-4"
                          align="left">
                          <div className="line-clamp-1">{job.prompt}</div>
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4"
                          align="center">
                          {job.modelId}
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4"
                          align="center">
                          {formatDate(job.createdDate)}
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4"
                          align="center">
                          <ButtonIcon
                            onClick={() => {
                              downloadFile(job);
                            }}
                            disabled={job.status === 'InProgress'}
                            loading={downloadingJobIds[job.createdDate]}>
                            <PiDownload className="text-aws-smile" />
                          </ButtonIcon>
                        </td>
                        <td
                          className="whitespace-nowrap px-6 py-4"
                          align="center">
                          <ButtonIcon
                            onClick={() => {
                              deleteVideoJob(job);
                            }}
                            disabled={job.status === 'InProgress'}
                            loading={deletingJobIds[job.createdDate]}>
                            <PiTrash className="text-red-500" />
                          </ButtonIcon>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {isLoadingVideoJobs && (
                <div className="flex h-12 w-full items-center justify-center">
                  <PiSpinnerGap className="mr-2 animate-spin text-lg" />
                </div>
              )}

              {canLoadMoreVideoJobs && !isLoadingVideoJobs && (
                <div className="flex h-12 w-full items-center justify-center">
                  <div
                    className="cursor-pointer hover:underline"
                    onClick={loadMoreVideoJobs}>
                    さらに読み込む
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateVideoPage;
