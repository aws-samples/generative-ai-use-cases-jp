import { useState, useCallback, useEffect, useMemo } from 'react';
import { VideoJob } from 'generative-ai-use-cases-jp';
import { create } from 'zustand';
import useVideo from '../hooks/useVideo';
import { MODELS } from '../hooks/useModel';
import useFileApi from '../hooks/useFileApi';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import Button from '../components/Button';
import Card from '../components/Card';
import { PiPlayFill } from 'react-icons/pi';

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
  const { generate, videoJobs, mutateVideoJobs, canLoadMoreVideoJobs, loadMoreVideoJobs } = useVideo();
  const { videoGenModelIds, videoGenModels } = MODELS;
  const { getFileDownloadSignedUrl } = useFileApi();
  const [videoSrc, setVideoSrc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // TODO
  useEffect(() => {
    setVideoGenModelId(videoGenModelIds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const downloadVideo = async (job: VideoJob) => {
    const signedUrl = await getFileDownloadSignedUrl(job.output);
    setVideoSrc(signedUrl);
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
          <div className="flex h-72 w-full justify-center">
            {videoSrc.length > 0 ? (
              <video
                className="w-128 h-72"
                src={videoSrc}
                autoPlay
                loop
                controls
              />
            ) : (
              <div className="w-128 relative h-72 border">
                <div className="absolute inset-0 flex items-center justify-center">
                  <PiPlayFill className="h-32 w-32 text-gray-200" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  再生ボタンを押してください
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-sm">ジョブ一覧</div>

          <table className="w-full table-auto border-collapse border border-gray-400">
            <thead>
              <tr>
                <th className="w-24 border border-gray-300 py-4"></th>
                <th className="w-24 border border-gray-300">ステータス</th>
                <th className="border border-gray-300"><span className="line-clamp-1">プロンプト</span></th>
                <th className="w-48 border border-gray-300">モデル</th>
                <th className="w-48 border border-gray-300">日時</th>
              </tr>
            </thead>
          </table>

          <div className="h-16 overflow-y-scroll">
            <table>
              <tbody>
                {videoJobs.map((job, idx) => {
                  return (
                    <tr key={idx}>
                      <td className="w-24 border border-gray-300 py-2" align="center">
                        <Button
                          onClick={() => {
                            downloadVideo(job);
                          }}
                          disabled={job.status === 'InProgress'}>
                          <PiPlayFill className="mr-2" />
                          再生
                        </Button>
                      </td>
                      <td className="w-24 border border-gray-300" align="center">
                        {job.status}
                      </td>
                      <td className="border border-gray-300" align="left">
                        <span className="line-clamp-1">{job.prompt}</span>
                      </td>
                      <td className="w-48 border border-gray-300" align="center">
                        {job.modelId}
                      </td>
                      <td className="w-48 border border-gray-300" align="center">
                        {formatDate(job.createdDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {canLoadMoreVideoJobs && (<div className="flex justify-center my-2">
              <div className="hover:underline cursor-pointer" onClick={loadMoreVideoJobs}>
                さらに読み込む
              </div>
            </div>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateVideoPage;
