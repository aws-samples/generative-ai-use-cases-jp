import React, { useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { create } from 'zustand';
import useEhon from '../../hooks/summit/useEhon';

type StateType = {
  inputTheme: string;
  summary: string[];
  scenes: { S: string }[];
  scenesCount: number;
  scenesImage: string[];
  isLoading: boolean;
  executionArn: string;
  ehonStatus: number;
  ehonAPIEndpoint: string;
  ehonStateMachineArn: string;
  setInputTheme: (value: string) => void;
  setSummary: (summary: string[]) => void;
  setScenes: (scenes: { S: string }[]) => void;
  setScenesCount: (count: number) => void;
  setScenesImage: (images: string[]) => void;
  setIsLoading: (loading: boolean) => void;
  setExecutionArn: (arn: string) => void;
  setEhonStatus: (status: number) => void;
}

const useEhonPageState = create<StateType>((set) => {
  const INIT_STATE = {
    inputTheme: '',
    summary: [],
    scenes: [],
    scenesCount: 0,
    scenesImage: [],
    isLoading: false,
    ehonStatus: 0, 
    executionArn: '',
    ehonAPIEndpoint: import.meta.env.VITE_APP_EHON_API_ENDPOINT,
    ehonStateMachineArn: import.meta.env.VITE_APP_EHON_STATE_MACHINE_ARN,
  };

  return {
    ...INIT_STATE,
    setInputTheme: (value: string) => {
      set(() => ({
        inputTheme: value,
      }));
    },
    setSummary: (summary: string[]) => {
      set(() => ({
        summary,
      }));
    },
    setScenes: (scenes: { S: string }[]) => {
      set(() => ({
        scenes,
      }));
    },
    setScenesCount: (count: number) => {
      set(() => ({
        scenesCount: count,
      }));
    },
    setScenesImage: (images: string[]) => {
      set(() => ({
        scenesImage: images,
      }));
    },
    setIsLoading: (loading: boolean) => {
      set(() => ({
        isLoading: loading,
      }));
    },
    setExecutionArn: (arn: string) => {
      set(() => ({
        executionArn: arn,
      }));
    },
    setEhonStatus: (status: number) => {
      set(() => ({
        ehonStatus: status,
      }));
    },
  };
});

const EhonPage: React.FC = () => {
  const {
    inputTheme,
    summary,
    scenes,
    scenesCount,
    scenesImage,
    isLoading,
    executionArn,
    ehonStatus,
    ehonAPIEndpoint,
    ehonStateMachineArn,
    setInputTheme,
    setSummary,
    setScenes,
    setScenesCount,
    setScenesImage,
    setIsLoading,
    setExecutionArn,
    setEhonStatus,
  } = useEhonPageState();
  const {
    ehonRequest,
    isExistRequest,
  } = useEhon();

  const handleSubmit = async () => {
    if(inputTheme){
      setIsLoading(true);
      setExecutionArn('');
      setSummary([]);
      setScenes([]);
      setScenesCount(0);
      setScenesImage([]);
      setEhonStatus(1);
      try {
        const cleanedValue = inputTheme.replace(/[\r\n\s]+/g, '');
        const requestBody = {
          "input": `{"theme" : "${cleanedValue}"}`,
          "stateMachineArn": ehonStateMachineArn,
        } 
        const res = await ehonRequest(`${ehonAPIEndpoint}create_ehon`, requestBody);
        setExecutionArn(res.data.executionArn.match(/:([a-f0-9-]+)$/)[1]);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  useEffect(() => {
    const pollForSummary = async () => {
      const res = await isExistRequest(`${ehonAPIEndpoint}check_summary?id=${executionArn}`);
      if (res.data.isFinished) {
        setSummary(res.data.summary);
      } else {
        setTimeout(pollForSummary, 5000);
      }
    };

    if (executionArn) {
      summary.length === 0 && pollForSummary();
    }
  }, [executionArn, summary]);

  useEffect(() => {
    const pollForScenesText = async () => {
      const result = await isExistRequest(`${ehonAPIEndpoint}check_scenes_text?id=${executionArn}`);
      if (result.data.isFinished) {
        setScenes(result.data.scenes);
        setScenesCount(result.data.scenes_count);
        setScenesImage(Array(result.data.scenes_count).fill(''));
      } else {
        setTimeout(pollForScenesText, 5000);
      }
    };

    if (executionArn && summary.length) {
      !scenes.length && pollForScenesText();
    }
  }, [executionArn, summary, scenes.length]);

  useEffect(() => {
    const pollForScenesImage = async (index: number) => {
      const result = await isExistRequest(`${ehonAPIEndpoint}check_scenes_image?id=${executionArn}&index=${index}`);
      if (result.data.isFinished) {
        const newScenesImage = [...scenesImage];
        newScenesImage[index] = result.data.s3_presigned_url;
        setScenesImage(newScenesImage);
        setEhonStatus(2);
        setIsLoading(false);
      } else {
        setTimeout(() => pollForScenesImage(index), 10000);
      }
    };

    if (executionArn && scenesCount) {
      for (let i = 0; i < scenesCount; i++) {
        !scenesImage[i] && pollForScenesImage(i);
      }
    }
  }, [executionArn, scenesCount, scenesImage]);


  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        絵本生成
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="生成する絵本のテーマを入力してください">
          <div className="mb-2 flex w-full">
            anthropic.claude-3-sonnet-20240229-v1:0
          </div>

          <Textarea
            placeholder="絵本のテーマを入力"
            value={inputTheme}
            onChange={setInputTheme}
          />
          <p>
            (例)<br/>
            ・昔話のつるのおんがえしを題材に、困っている人を助けると自分に善い行いが返ってくることや、約束を破ってはいけないといったことの大切さを描写してください<br/>
            ・昔話のわらしべ長者を題材に、信心の大切さやどのような物でも大切に扱わないといけないことの重要性を描いてください
          </p>
          <div className="flex justify-end gap-3">
            <Button disabled={ehonStatus === 1} onClick={handleSubmit}>
              実行
            </Button>
          </div>
        </Card>
      </div>
      <div className="mt-5 col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="あらすじ">
          {isLoading && !summary.length ? (
            <div className="m-auto border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
          ) : (
            <>{summary}</>
          )}
        </Card>
      </div>      
      <div className="mt-5 col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="詳しいストーリー (文章+画像)">
        {isLoading && !scenes.length ? (
            <div className="m-auto border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
          ) : (
            <>
              {scenes.map((scene, index) => (
                <div key={index}>
                  <p>{index + 1}: {scene.S}</p>
                  <div>
                    {scenesImage[index] && <img src={scenesImage[index]} alt={`Scene ${index + 1}`} className="m-auto mt-5 mb-5 max-h-[30vh]" />}
                    {!scenesImage[index] && <div className="m-auto mt-5 mb-5 border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>     
    </div>
  );
};

export default EhonPage;
