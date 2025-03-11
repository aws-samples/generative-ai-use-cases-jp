import { useState, useCallback, useEffect, useMemo } from 'react';
import { VideoJob } from 'generative-ai-use-cases-jp';
import { create } from 'zustand';
import useVideo from '../hooks/useVideo';
import { MODELS } from '../hooks/useModel';
import useFileApi from '../hooks/useFileApi';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import ButtonIcon from '../components/ButtonIcon';
import Button from '../components/Button';
import ButtonCopy from '../components/ButtonCopy';
import Card from '../components/Card';
import {
  PiPlayFill,
  PiDownload,
  PiSpinnerGap,
  PiArrowClockwise,
} from 'react-icons/pi';
import { GenerateVideoPageQueryParams } from '../@types/navigate';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';

type StateType = {
  videoGenModelId: string;
  setVideoGenModelId: (s: string) => void;
  prompt: string;
  setPrompt: (s: string) => void;
  dimension: string;
  setDimension: (s: string) => void;
  durationSeconds: number;
  setDurationSeconds: (n: number) => void;
  fps: number;
  setFps: (n: number) => void;
  seed: number;
  setSeed: (n: number) => void;
  clear: () => void;
};

const useGenerateVideoPageState = create<StateType>((set) => {
  const INIT_STATE = {
    videoGenModelId: '',
    prompt: '',
    dimension: '1280x720',
    durationSeconds: 6,
    fps: 24,
    seed: 0,
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
    clear: () => {
      set(INIT_STATE);
    },
  };
});

type Options = {
  dimension: string[];
  durationSeconds: number[];
  fps: number[];
};

// 今の所 Nova Reel しかサポートされていないので簡易な管理方法に留める
const supportedOptions: Record<string, Options> = {
  'amazon.nova-reel-v1:0': {
    dimension: ['1280x720'],
    durationSeconds: [6],
    fps: [24],
  },
};

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
    clear,
  } = useGenerateVideoPageState();
  const { search } = useLocation();
  const {
    generate,
    videoJobs,
    mutateVideoJobs,
    canLoadMoreVideoJobs,
    loadMoreVideoJobs,
    isLoadingVideoJobs,
    isValidatingVideoJobs,
  } = useVideo();
  const { videoGenModelIds, videoGenModels } = MODELS;
  const { getFileDownloadSignedUrl } = useFileApi();
  const [previewVideoSrc, setPreviewVideoSrc] = useState('');
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

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
      setDimension(
        supportedOptions[videoGenModelId]?.dimension[0] ?? '1280x720'
      );
      setDurationSeconds(
        supportedOptions[videoGenModelId]?.durationSeconds[0] ?? 6
      );
      setFps(supportedOptions[videoGenModelId]?.fps[0] ?? 24);
      setSeed(0);
    }
  }, [
    videoGenModelId,
    setVideoGenModelId,
    setDimension,
    setDurationSeconds,
    setFps,
    setSeed,
    videoGenModelIds,
  ]);

  const generateVideo = useCallback(async () => {
    setIsGenerating(true);

    await generate(
      {
        taskType: 'TEXT_VIDEO',
        textToVideoParams: {
          text: prompt,
        },
        videoGenerationConfig: {
          durationSeconds,
          fps,
          dimension,
          seed,
        },
      },
      videoGenModels.find((m) => m.modelId === videoGenModelId)
    );

    mutateVideoJobs();
    setIsGenerating(false);
  }, [
    generate,
    prompt,
    durationSeconds,
    fps,
    dimension,
    seed,
    videoGenModels,
    videoGenModelId,
    mutateVideoJobs,
    setIsGenerating,
  ]);

  const setPreview = async (job: VideoJob) => {
    setPreviewPrompt(job.prompt);
    const signedUrl = await getFileDownloadSignedUrl(job.output);
    setPreviewVideoSrc(signedUrl);
  };

  const downloadFile = async (job: VideoJob) => {
    setDownloadingJobId(job.jobId);
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
    setDownloadingJobId(null);
  };

  const disabledExec = useMemo(() => {
    return prompt.length === 0 || isGenerating;
  }, [prompt, isGenerating]);

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

          <Textarea
            value={prompt}
            onChange={setPrompt}
            label="プロンプト"
            placeholder="Kids are playing with many balls"
            rows={3}
            required
          />

          <Select
            label="解像度"
            value={dimension}
            onChange={setDimension}
            options={
              supportedOptions[videoGenModelId]?.dimension.map((m: string) => {
                return { value: m, label: m };
              }) ?? []
            }
            fullWidth
          />
          <Select
            label="動画長"
            value={`${durationSeconds}`}
            onChange={(n: string) => {
              setDurationSeconds(Number(n));
            }}
            options={
              supportedOptions[videoGenModelId]?.durationSeconds.map(
                (m: number) => {
                  return { value: `${m}`, label: `${m}` };
                }
              ) ?? []
            }
            fullWidth
          />
          <Select
            label="FPS"
            value={`${fps}`}
            onChange={(n: string) => {
              setFps(Number(n));
            }}
            options={
              supportedOptions[videoGenModelId]?.fps.map((m: number) => {
                return { value: `${m}`, label: `${m}` };
              }) ?? []
            }
            fullWidth
          />

          <div className="mt-4 flex flex-row items-center gap-x-5">
            <Button
              className="h-8 w-full"
              disabled={disabledExec}
              onClick={generateVideo}>
              生成
            </Button>
            <Button
              className="h-8 w-full"
              outlined
              onClick={clear}
              disabled={disabledExec}>
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
                      className="min-w-24 bg-gray-50 px-6 py-3"
                      align="center">
                      アクション
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
                          <div className="flex flex-row items-center justify-center gap-x-2">
                            <ButtonIcon
                              onClick={() => {
                                setPreview(job);
                              }}
                              disabled={job.status === 'InProgress'}>
                              <PiPlayFill className="text-aws-smile" />
                            </ButtonIcon>
                            <ButtonIcon
                              onClick={() => {
                                downloadFile(job);
                              }}
                              disabled={
                                job.status === 'InProgress' ||
                                downloadingJobId !== null
                              }
                              loading={downloadingJobId === job.jobId}>
                              <PiDownload className="text-aws-smile" />
                            </ButtonIcon>
                          </div>
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
