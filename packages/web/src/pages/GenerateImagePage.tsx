import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { create } from 'zustand';
import RangeSlider from '../components/RangeSlider';
import Select from '../components/Select';
import ExpandableField from '../components/ExpandableField';
import ButtonIcon from '../components/ButtonIcon';
import { PiFileArrowUp, PiDiceFive } from 'react-icons/pi';
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
import { GenerateImagePageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import queryString from 'query-string';

const MAX_SAMPLE = 7;

type StateType = {
  imageGenModelId: string;
  setImageGenModelId: (c: string) => void;
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
    imageGenModelId: '',
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
    setImageGenModelId: (s: string) => {
      set(() => ({
        imageGenModelId: s,
      }));
    },
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
    imageGenModelId,
    setImageGenModelId,
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

  const { pathname, search } = useLocation();
  const { generate } = useImage();
  const {
    getModelId,
    setModelId,
    loading: loadingChat,
    clear: clearChat,
  } = useChat(pathname);

  const [generating, setGenerating] = useState(false);
  const [isOpenSketch, setIsOpenSketch] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { modelIds, imageGenModelIds, imageGenModels } = MODELS;
  const modelId = getModelId();

  // LandingPage のデモデータ設定
  useEffect(() => {
    const _modelId = !modelId ? modelIds[0] : modelId;
    const _imageGenModelId = !imageGenModelId
      ? imageGenModelIds[0]
      : imageGenModelId;

    if (search !== '') {
      const params = queryString.parse(search) as GenerateImagePageQueryParams;
      setChatContent(params.content ?? '');
      setModelId(
        modelIds.includes(params.modelId ?? '') ? params.modelId! : _modelId
      );
      setImageGenModelId(
        imageGenModelIds.includes(params.imageModelId ?? '')
          ? params.imageModelId!
          : _imageGenModelId
      );
    } else {
      setModelId(_modelId);
      setImageGenModelId(_imageGenModelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageGenModelId,
    imageGenModelIds,
    modelId,
    modelIds,
    search,
    setChatContent,
    setImageGenModelId,
  ]);

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

        return generate(
          {
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
          },
          imageGenModels.find((m) => m.modelId === imageGenModelId)
        )
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
      imageGenModels,
      imageGenModelId,
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
    setSelectedImageIndex(0);
    clear();
    clearChat();
  }, [clear, clearChat]);

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <ModalDialog
        isOpen={isOpenSketch}
        title="初期画像の設定"
        className="w-[530px]"
        help="画像生成の初期状態として使われます。指定した画像に近い画像が生成されます。"
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

      <div className="col-span-12 h-[calc(100vh-2rem)] lg:col-span-6">
        <GenerateImageAssistant
          modelId={modelId}
          onChangeModel={setModelId}
          modelIds={modelIds}
          content={chatContent}
          onChangeContent={setChatContent}
          isGeneratingImage={generating}
          onGenerate={async (p, np, sp) => {
            // 設定に変更があった場合のみ生成する
            if (
              p !== prompt ||
              np !== negativePrompt ||
              (sp ?? '') !== stylePreset
            ) {
              setSelectedImageIndex(0);
              setPrompt(p);
              setNegativePrompt(np);
              if (sp !== undefined) {
                setStylePreset(sp);
              }
              return generateImage(p, np, sp);
            }
          }}
        />
      </div>

      <div className="col-span-12 lg:col-span-6">
        <Card className="lg:min-h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-center">
            <Base64Image
              className="size-60"
              imageBase64={image[selectedImageIndex].base64}
              loading={generating}
              error={image[selectedImageIndex].error}
              errorMessage={image[selectedImageIndex].errorMessage}
            />
          </div>

          <div className="mb-2 flex flex-row justify-center gap-x-2">
            {image.map((image, idx) => (
              <React.Fragment key={idx}>
                {idx < imageSample && (
                  <Base64Image
                    className={`${
                      idx === selectedImageIndex ? 'ring-1' : ''
                    } mt-3 size-10`}
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

          <Textarea
            label="プロンプト"
            help="生成したい画像の説明を記載してください。文章ではなく、単語の羅列で記載します。"
            value={prompt}
            onChange={setPrompt}
            maxHeight={60}
            rows={2}
          />

          <Textarea
            label="ネガティブプロンプト"
            help="生成したくない要素、排除したい要素を記載してください。文章ではなく、単語の羅列で記載します。"
            value={negativePrompt}
            onChange={setNegativePrompt}
            maxHeight={60}
            rows={2}
          />

          <Select
            value={imageGenModelId}
            onChange={setImageGenModelId}
            options={imageGenModelIds.map((m) => {
              return { value: m, label: m };
            })}
          />

          <div className="grid w-full grid-cols-2 gap-2 pt-4">
            <div className="relative col-span-2 flex flex-row items-center lg:col-span-1">
              <RangeSlider
                className="w-full"
                label="Seed"
                min={0}
                max={4294967295}
                value={seed[selectedImageIndex]}
                onChange={(n) => {
                  setSeed(n, selectedImageIndex);
                }}
                help="乱数のシード値です。同じシード値を指定すると同じ画像が生成されます。"
              />
              <ButtonIcon
                className="absolute -top-0.5 right-[8.2rem]"
                onClick={onClickRandomSeed}>
                <PiDiceFive />
              </ButtonIcon>
            </div>

            <RangeSlider
              className="col-span-2 lg:col-span-1"
              label="画像生成数"
              min={1}
              max={7}
              value={imageSample}
              onChange={setImageSample}
              help="Seed をランダム設定しながら画像を指定の数だけ同時に生成します。"
            />
          </div>

          <ExpandableField label="詳細なパラメータ">
            <div className="grid grid-cols-2 pt-4">
              <div className="col-span-2 flex flex-col items-center justify-center lg:col-span-1">
                <div className="mb-1 flex items-center text-sm font-bold">
                  初期画像
                  <Help
                    className="ml-1"
                    position="center"
                    message="画像生成の初期状態となる画像を設定できます。初期画像を設定することで、初期画像に近い画像を生成するように誘導できます。"
                  />
                </div>
                <Base64Image
                  className="size-32"
                  imageBase64={initImageBase64}
                />
                <Button
                  className="m-auto mt-2 text-sm"
                  onClick={() => {
                    setIsOpenSketch(true);
                  }}>
                  <PiFileArrowUp className="mr-2" />
                  設定
                </Button>
              </div>

              <div className="col-span-2 flex flex-col items-center justify-center lg:col-span-1">
                <div className="mb-2 w-full">
                  <Select
                    label="StylePreset"
                    options={stylePresetOptions}
                    value={stylePreset}
                    onChange={setStylePreset}
                    clearable
                    fullWidth
                  />
                </div>

                <RangeSlider
                  className="w-full"
                  label="CFG Scale"
                  min={0}
                  max={30}
                  value={cfgScale}
                  onChange={setCfgScale}
                  help="この値が高いほどプロンプトに対して忠実な画像を生成します。"
                />

                <RangeSlider
                  className="w-full"
                  label="Step"
                  min={10}
                  max={150}
                  value={step}
                  onChange={setStep}
                  help="画像生成の反復回数です。Step 数が多いほど画像が洗練されますが、生成に時間がかかります。"
                />

                <RangeSlider
                  className="w-full"
                  label="ImageStrength"
                  min={0}
                  max={1}
                  step={0.01}
                  value={imageStrength}
                  onChange={setImageStrength}
                  help="1に近いほど「初期画像」に近い画像が生成され、0に近いほど「初期画像」とは異なる画像が生成されます。"
                />
              </div>
            </div>
          </ExpandableField>

          <div className="flex flex-row items-center gap-x-5">
            <Button
              className="h-8 w-full"
              onClick={() => {
                setSelectedImageIndex(0);
                generateImage(prompt, negativePrompt);
              }}
              loading={generating || loadingChat}>
              生成
            </Button>

            <Button
              className="h-8 w-full"
              outlined
              onClick={() => {
                clearAll();
              }}
              disabled={generating || loadingChat}>
              クリア
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateImagePage;
