import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { create } from 'zustand';
import RangeSlider from '../components/RangeSlider';
import Select from '../components/Select';
import { PiFileArrowUp } from 'react-icons/pi';
import useImage from '../hooks/useImage';
import GenerateImageAssistant from '../components/GenerateImageAssistant';
import SketchPad from '../components/SketchPad';
import ModalDialog from '../components/ModalDialog';
import { produce } from 'immer';
import Help from '../components/Help';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import Base64Image from '../components/Base64Image';
import { AxiosError } from 'axios';

const MAX_SAMPLE = 7;

type StateType = {
  prompt: string;
  setPrompt: (s: string) => void;
  negativePrompt: string;
  setNegativePrompt: (s: string) => void;
  stylePreset: string;
  setStylePreset: (s: string) => void;
  seed: number[];
  setSeed: (n: number, idx: number) => void;
  step: number;
  setStep: (n: number) => void;
  cfgScale: number;
  setCfgScale: (n: number) => void;
  imageStrength: number;
  setImageStrength: (n: number) => void;
  initImageBase64: string;
  setInitImageBase64: (s: string) => void;
  imageSample: number;
  setImageSample: (n: number) => void;
  image: {
    base64: string;
    error: boolean;
    errorMessage?: string;
  }[];
  clearImage: () => void;
  setImage: (index: number, base64: string) => void;
  setImageError: (index: number, errorMessage: string) => void;
  chatContent: string;
  setChatContent: (s: string) => void;
  clear: () => void;
};

const useGenerateImagePageState = create<StateType>((set, get) => {
  const INIT_STATE = {
    prompt: '',
    negativePrompt: '',
    stylePreset: '',
    seed: [0, ...new Array(MAX_SAMPLE - 1).fill(-1)],
    step: 50,
    cfgScale: 7,
    imageStrength: 0.35,
    initImageBase64: '',
    imageSample: 3,
    image: new Array(MAX_SAMPLE).fill({
      base64: '',
      error: false,
    }),
    chatContent: '',
  };

  return {
    ...INIT_STATE,
    setPrompt: (s) => {
      set(() => ({
        prompt: s,
      }));
    },
    setNegativePrompt: (s) => {
      set(() => ({
        negativePrompt: s,
      }));
    },
    setStylePreset: (s) => {
      set(() => ({
        stylePreset: s,
      }));
    },
    setSeed: (n, idx) => {
      set(() => ({
        seed: produce(get().seed, (draft) => {
          draft[idx] = n;
        }),
      }));
    },
    setStep: (n) => {
      set(() => ({
        step: n,
      }));
    },
    setCfgScale: (n) => {
      set(() => ({
        cfgScale: n,
      }));
    },
    setImageStrength: (n) => {
      set(() => ({
        imageStrength: n,
      }));
    },
    setInitImageBase64: (s) => {
      set(() => ({
        initImageBase64: s,
      }));
    },
    setImageSample: (n) => {
      set(() => ({
        imageSample: n,
      }));
    },
    setImage: (index, base64) => {
      set(() => ({
        image: produce(get().image, (draft) => {
          draft.splice(index, 1, {
            base64,
            error: false,
          });
        }),
      }));
    },
    setImageError: (index, errorMessage) => {
      set(() => ({
        image: produce(get().image, (draft) => {
          draft.splice(index, 1, {
            base64: '',
            error: true,
            errorMessage,
          });
        }),
      }));
    },
    clearImage: () => {
      set(() => ({
        image: [...INIT_STATE.image],
      }));
    },
    setChatContent: (s) => {
      set(() => ({
        chatContent: s,
      }));
    },
    clear: () => {
      set(() => ({
        ...INIT_STATE,
      }));
    },
  };
});

// StableDiffusion の StylePreset
// 一覧は、以下の style_preset を参照
// https://platform.stability.ai/docs/api-reference#tag/v1generation/operation/textToImage
const stylePresetOptions = [
  '3d-model',
  'analog-film',
  'anime',
  'cinematic',
  'comic-book',
  'digital-art',
  'enhance',
  'fantasy-art',
  'isometric',
  'line-art',
  'low-poly',
  'modeling-compound',
  'neon-punk',
  'origami',
  'photographic',
  'pixel-art',
  'tile-texture',
].map((s) => ({
  value: s,
  label: s,
}));

const GenerateImagePage: React.FC = () => {
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    stylePreset,
    setStylePreset,
    seed,
    setSeed,
    step,
    setStep,
    cfgScale,
    setCfgScale,
    initImageBase64,
    setInitImageBase64,
    image,
    setImage,
    setImageError,
    clearImage,
    imageSample,
    setImageSample,
    imageStrength,
    setImageStrength,
    chatContent,
    setChatContent,
    clear,
  } = useGenerateImagePageState();

  const { pathname, state } = useLocation();
  const { generate } = useImage();
  const { loading: loadingChat, clear: clearChat } = useChat(pathname);

  const [generating, setGenerating] = useState(false);
  const [isOpenSketch, setIsOpenSketch] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // LandingPage のデモデータ設定
  useEffect(() => {
    if (state !== null) {
      setChatContent(state.content);
    }
  }, [setChatContent, state]);

  const generateRandomSeed = useCallback(() => {
    return Math.floor(Math.random() * 4294967295);
  }, []);

  const generateImage = useCallback(
    async (_prompt: string, _negativePrompt: string, _stylePreset?: string) => {
      clearImage();
      setGenerating(true);

      const promises = new Array(imageSample).fill('').map((_, idx) => {
        let _seed = seed[idx];
        if (_seed < 0) {
          const rand = generateRandomSeed();
          setSeed(rand, idx);
          _seed = rand;
        }

        return generate({
          textPrompt: [
            {
              text: _prompt,
              weight: 1,
            },
            {
              text: _negativePrompt,
              weight: -1,
            },
          ],
          cfgScale,
          seed: _seed,
          step,
          stylePreset: _stylePreset ?? stylePreset,
          initImage: initImageBase64,
          imageStrength: imageStrength,
        })
          .then((res) => {
            setImage(idx, res);
          })
          .catch((e: AxiosError<{ message: string }>) => {
            console.log(e);
            setImageError(idx, e.response?.data.message ?? e.message);
          });
      });

      await Promise.all(promises).finally(() => {
        setGenerating(false);
      });
    },
    [
      cfgScale,
      clearImage,
      generate,
      generateRandomSeed,
      imageSample,
      imageStrength,
      initImageBase64,
      seed,
      setImage,
      setImageError,
      setSeed,
      step,
      stylePreset,
    ]
  );

  const onClickRandomSeed = useCallback(() => {
    setSeed(generateRandomSeed(), selectedImageIndex);
  }, [generateRandomSeed, selectedImageIndex, setSeed]);

  const onChangeInitImageBase64 = useCallback(
    (s: string) => {
      setInitImageBase64(s);
      setIsOpenSketch(false);
    },
    [setInitImageBase64]
  );

  const onSelectImage = useCallback(
    (idx: number) => {
      if (seed[idx] < 0) {
        setSeed(generateRandomSeed(), idx);
      }
      setSelectedImageIndex(idx);
    },
    [generateRandomSeed, seed, setSeed]
  );

  const clearAll = useCallback(() => {
    clear();
    clearChat();
  }, [clear, clearChat]);

  return (
    <>
      <ModalDialog
        isOpen={isOpenSketch}
        title="초기 이미지 설정"
        className="w-[530px]"
        help="이미지 생성 초기 상태로 사용됩니다. 지정한 이미지에 가까운 이미지가 생성됩니다."
        onClose={() => {
          setIsOpenSketch(false);
        }}>
        <SketchPad
          imageBase64={initImageBase64}
          onChange={onChangeInitImageBase64}
          onCancel={() => {
            setIsOpenSketch(false);
          }}
        />
      </ModalDialog>

      <div className="pt-5">
        <div className="grid grid-cols-6 gap-x-12 px-8 lg:grid-cols-12 lg:px-32">
          <div className="col-span-6">
            <div className="h-[32rem]">
              <GenerateImageAssistant
                content={chatContent}
                onChangeContent={setChatContent}
                isGeneratingImage={generating}
                onGenerate={(p, np, sp) => {
                  setSelectedImageIndex(0);
                  setPrompt(p);
                  setNegativePrompt(np);
                  if (sp !== undefined) {
                    setStylePreset(sp);
                  }
                  return generateImage(p, np, sp);
                }}
              />
            </div>

            <Card className="mt-8 flex">
              <div className="w-full">
                <Textarea
                  label="프롬프트"
                  help="생성하고자 하는 이미지의 설명을 기재해 주세요.문장이 아닌 단어 나열로 기재합니다."
                  value={prompt}
                  onChange={setPrompt}
                  maxHeight={84}
                  rows={3}
                />

                <Textarea
                  label="네거티브 프롬프트"
                  help="생성하고 싶지 않은 요소, 배제하고 싶은 요소를 기재해 주세요.문장이 아닌 단어 나열로 기재합니다."
                  value={negativePrompt}
                  onChange={setNegativePrompt}
                  maxHeight={84}
                  rows={3}
                />
              </div>
            </Card>
          </div>

          <div className="col-span-6">
            <Card className="mt-8 flex flex-col items-center justify-center lg:mt-0">
              <div className="flex justify-center">
                <Base64Image
                  className="h-56 w-56"
                  imageBase64={image[selectedImageIndex].base64}
                  loading={generating}
                  error={image[selectedImageIndex].error}
                  errorMessage={image[selectedImageIndex].errorMessage}
                />
              </div>
              <div className="flex flex-row justify-center gap-x-2">
                {image.map((image, idx) => (
                  <React.Fragment key={idx}>
                    {idx < imageSample && (
                      <Base64Image
                        className={`${
                          idx === selectedImageIndex ? 'ring-1' : ''
                        } mt-3 h-10 w-10`}
                        imageBase64={image.base64}
                        loading={generating}
                        clickable
                        error={image.error}
                        onClick={() => {
                          onSelectImage(idx);
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card>

            <Card label="변수입력" className="mb-14 mt-8">
              <div className="flex flex-col">
                <div className="mb-8 flex flex-col xl:flex-row">
                  <div className="flex w-full flex-col items-center justify-center xl:w-1/2">
                    <div className="mb-1 flex items-center text-sm font-bold">
                      초기 이미지
                      <Help
                        className="ml-1"
                        direction="left"
                        message="이미지 생성의 초기 상태가 되는 이미지를 설정할 수 있습니다.초기 이미지를 설정함으로써 초기 이미지에 가까운 이미지를 생성하도록 유도할 수 있습니다."
                      />
                    </div>
                    <Base64Image
                      className="h-32 w-32"
                      imageBase64={initImageBase64}
                    />
                    <Button
                      className="m-auto mt-2 text-sm"
                      onClick={() => {
                        setIsOpenSketch(true);
                      }}>
                      <PiFileArrowUp className="mr-2" />
                      설정
                    </Button>
                  </div>

                  <div className="w-full xl:w-1/2">
                    <Select
                      label="StylePreset"
                      options={stylePresetOptions}
                      value={stylePreset}
                      onChange={setStylePreset}
                      clearable
                    />

                    <RangeSlider
                      label="Seed"
                      min={0}
                      max={4294967295}
                      value={seed[selectedImageIndex]}
                      onChange={(n) => {
                        setSeed(n, selectedImageIndex);
                      }}
                      help="난수의 시드 값입니다.같은 시드 값을 지정하면 같은 이미지가 생성됩니다."
                    />

                    <div className="-mt-3 mb-3 flex w-full justify-end text-xs">
                      <Button onClick={onClickRandomSeed}>
                        Seed 를 랜덤 설정
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row xl:gap-x-4">
                  <RangeSlider
                    className="w-full xl:w-1/2"
                    label="이미지 생성 수"
                    min={1}
                    max={7}
                    value={imageSample}
                    onChange={setImageSample}
                    help="Seed 를 랜덤 설정하면서 이미지를 지정된 개수만큼 동시에 생성합니다."
                  />

                  <RangeSlider
                    className="w-full xl:w-1/2"
                    label="CFG Scale"
                    min={0}
                    max={30}
                    value={cfgScale}
                    onChange={setCfgScale}
                    help="이 값이 높을수록 프롬프트 내용에 충실한 이미지를 생성합니다."
                  />
                </div>

                <div className="flex flex-col xl:flex-row xl:gap-x-4">
                  <RangeSlider
                    className="w-full xl:w-1/2"
                    label="Step"
                    min={10}
                    max={150}
                    value={step}
                    onChange={setStep}
                    help="이미지 생성 반복 횟수입니다. Step 수가 많을수록 이미지가 세련되지만 생성에 시간이 걸립니다."
                  />

                  <RangeSlider
                    className="w-full xl:w-1/2"
                    label="ImageStrength"
                    min={0}
                    max={1}
                    step={0.01}
                    value={imageStrength}
                    onChange={setImageStrength}
                    help="1에 가까울수록 '초기 이미지'에 가까운 이미지가 생성되고, 0에 가까울수록 '초기 이미지'와는 다른 이미지가 생성됩니다."
                  />
                </div>
              </div>

              <div className="flex flex-row items-center gap-x-5">
                <Button
                  className="h-8 w-full"
                  onClick={() => {
                    setSelectedImageIndex(0);
                    generateImage(prompt, negativePrompt);
                  }}
                  loading={generating || loadingChat}>
                  생성
                </Button>

                <Button
                  className="h-8 w-full"
                  outlined
                  onClick={() => {
                    clearAll();
                  }}
                  disabled={generating || loadingChat}>
                  지우기
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default GenerateImagePage;
