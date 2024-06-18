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
  scenesImage: string[];
  isLoading: boolean;
  executionArn: string;
  ehonStatus: number;
  ehonAPIEndpoint: string;
  ehonStateMachineArn: string;
  setInputTheme: (value: string) => void;
  setSummary: (summary: string[]) => void;
  setScenes: (scenes: { S: string }[]) => void;
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

const RoundedButton = (
  props: React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) => {
  return (
    <button
      className="cursor-pointer rounded-full border p-2 text-xs hover:border-gray-300 hover:bg-gray-50"
      {...props}
    />
  );
};

const EhonPage: React.FC = () => {
  const {
    inputTheme,
    summary,
    scenes,
    scenesImage,
    isLoading,
    executionArn,
    ehonStatus,
    ehonAPIEndpoint,
    ehonStateMachineArn,
    setInputTheme,
    setSummary,
    setScenes,
    setScenesImage,
    setIsLoading,
    setExecutionArn,
    setEhonStatus,
  } = useEhonPageState();
  const {
    ehonRequest,
    usePolling,
    response,
  } = useEhon();

  const handleSubmit = async () => {
    if(inputTheme){
      setIsLoading(true);
      setExecutionArn('');
      setSummary([]);
      setScenes([]);
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
    if(response?.summary){
      setSummary(response.summary);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  useEffect(() => {
    if(response && response?.scenes && ehonStatus !== 2){
      setScenes(response.scenes);
      setScenesImage(Array(response.scenes.length).fill(''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  useEffect(() => {
    if(response && response?.s3_presigned_urls && ehonStatus !== 2){
      setScenesImage(response.s3_presigned_urls);
      setEhonStatus(2);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);  

  usePolling(executionArn ? `${ehonAPIEndpoint}check_summary?id=${executionArn}` : null , summary.length ? 0 : 1000)
  usePolling(summary.length ? `${ehonAPIEndpoint}check_scenes_text?id=${executionArn}` : null , scenes.length ? 0 : 3000)
  usePolling(scenes.length ? `${ehonAPIEndpoint}check_scenes_image?id=${executionArn}&count=${scenes.length}` : null , scenesImage[0] ? 0 : 3000)

  const examplePrompts = [
    {
      label: '鶴の恩返し',
      value: '昔話のつるのおんがえしを題材に、困っている人を助けると自分に善い行いが返ってくることや、約束を破ってはいけないといったことの大切さを描写してください',
    },
    {
      label: '桃太郎',
      value: '昔話の桃太郎を題材に、鬼と人間が種族を超えて手を取り合うことの大切さを描写してください',
    },
    {
      label: 'わらしべ長者',
      value: '昔話のわらしべ長者を題材に、信心の大切さやどのような物でも大切に扱わないといけないことの重要性を描いてください',
    },
    {
      label: 'こぶとりじいさん',
      value:
        '昔話のこぶとりじいさんを題材に、何事も行動力や好奇心を持って挑めば、物事は良い方向に進むということの大切さを描いてください',
    },
    {
      label: 'さるかに合戦',
      value:
        '昔話のさるかに合戦を題材に、悪い行いをすると自分に返ってくるということの大切さを描いてください',
    },
    {
      label: 'おむすびころりん',
      value: '昔話のおむすびころりんを題材に、欲張りすぎると痛い目を見るという教訓を描いてください',
    },
    {
      label: '地球を救うヒーロー',
      value: '悪の組織から地球を救うヒーローの物語を描いてください',
    },
    {
      label: '天才エンジニアの物語',
      value: '人口減少に苦しむ村を救った天才エンジニアの物語を描いてください',
    },
  ];

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
          <div className="mb-2 mt-4 flex justify-between">
            <div className="mb-2 flex gap-2">
              {examplePrompts.map(({ value, label }) => (
                <RoundedButton
                  onClick={() => setInputTheme(value)}
                  key={label}>
                  {label} ↗️
                </RoundedButton>
              ))}
            </div>
          </div>          
          <div className="flex justify-end gap-3">
            <Button disabled={ehonStatus === 1 || !inputTheme} onClick={handleSubmit}>
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
              {scenesImage && scenesImage.map((url, index) => (
                <div key={index}>
                  <p>{index + 1}: {scenes[index].S}</p>
                  <div>
                    {url && <img src={url} alt={`Scene ${index + 1}`} className="m-auto mt-5 mb-5 max-h-[30vh]" />}
                    {!url && <div className="m-auto mt-5 mb-5 border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>}
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
