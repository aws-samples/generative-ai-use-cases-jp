import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { create } from 'zustand';
import RangeSlider from '../components/RangeSlider';
import Select from '../components/Select';
import ExpandableField from '../components/ExpandableField';
import ButtonIcon from '../components/ButtonIcon';
import { PiFileArrowUp, PiDiceFive, PiNotePencil } from 'react-icons/pi';
import useImage from '../hooks/useImage';
import GenerateImageAssistant from '../components/GenerateImageAssistant';
import SketchPad, { Canvas } from '../components/SketchPad';
import ModalDialog from '../components/ModalDialog';
import { produce } from 'immer';
import Help from '../components/Help';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import Base64Image from '../components/Base64Image';
import { AxiosError } from 'axios';
import { GenerateImagePageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import { getPrompter } from '../prompts';
import queryString from 'query-string';
import { GenerateImageParams } from 'generative-ai-use-cases-jp';

const MAX_SAMPLE = 7;

const TITAN_MODELS = {
  V1: 'amazon.titan-image-generator-v1',
  V2: 'amazon.titan-image-generator-v2:0',
};
const STABILITY_AI_MODELS = {
  STABLE_DIFFUSION_XL: 'stability.stable-diffusion-xl-v1',
  SD3_LARGE: 'stability.sd3-large-v1:0',
  STABLE_IMAGE_CORE: 'stability.stable-image-core-v1:0',
  STABLE_IMAGE_ULTRA: 'stability.stable-image-ultra-v1:0',
};
const GENERATION_MODES = {
  TEXT_IMAGE: 'TEXT_IMAGE',
  IMAGE_VARIATION: 'IMAGE_VARIATION',
  INPAINTING: 'INPAINTING',
  OUTPAINTING: 'OUTPAINTING',
} as const;
type GenerationMode = (typeof GENERATION_MODES)[keyof typeof GENERATION_MODES];
const modeOptions = Object.values(GENERATION_MODES).map((mode) => ({
  value: mode,
  label: mode,
}));
type ModelInfo = {
  supportedModes: GenerationMode[];
  resolutionPresets: { value: string; label: string }[];
};
const defaultModelPresets = [
  { value: '512 x 512', label: '512 x 512' },
  { value: '1024 x 1024', label: '1024 x 1024' },
  { value: '1280 x 768', label: '1280 x 768' },
  { value: '768 x 1280', label: '768 x 1280' },
];
const stabilityAi2024ModelPresets = [
  { value: '1:1', label: '1024 x 1024' },
  { value: '5:4', label: '1088 x 896' },
  { value: '3:2', label: '1216 x 832' },
  { value: '16:9', label: '1344 x 768' },
  { value: '21:9', label: '1536 x 640' },
];
const modelInfo: Record<string, ModelInfo> = {
  [STABILITY_AI_MODELS.STABLE_DIFFUSION_XL]: {
    supportedModes: [
      GENERATION_MODES.TEXT_IMAGE,
      GENERATION_MODES.IMAGE_VARIATION,
      GENERATION_MODES.INPAINTING,
      GENERATION_MODES.OUTPAINTING,
    ],
    resolutionPresets: defaultModelPresets,
  },
  [STABILITY_AI_MODELS.SD3_LARGE]: {
    supportedModes: [
      GENERATION_MODES.TEXT_IMAGE,
      GENERATION_MODES.IMAGE_VARIATION,
    ],
    resolutionPresets: stabilityAi2024ModelPresets,
  },
  [STABILITY_AI_MODELS.STABLE_IMAGE_CORE]: {
    supportedModes: [GENERATION_MODES.TEXT_IMAGE],
    resolutionPresets: stabilityAi2024ModelPresets,
  },
  [STABILITY_AI_MODELS.STABLE_IMAGE_ULTRA]: {
    supportedModes: [GENERATION_MODES.TEXT_IMAGE],
    resolutionPresets: stabilityAi2024ModelPresets,
  },
  [TITAN_MODELS.V1]: {
    supportedModes: [
      GENERATION_MODES.TEXT_IMAGE,
      GENERATION_MODES.IMAGE_VARIATION,
      GENERATION_MODES.INPAINTING,
      GENERATION_MODES.OUTPAINTING,
    ],
    resolutionPresets: defaultModelPresets,
  },
  [TITAN_MODELS.V2]: {
    supportedModes: [
      GENERATION_MODES.TEXT_IMAGE,
      GENERATION_MODES.IMAGE_VARIATION,
      GENERATION_MODES.INPAINTING,
      GENERATION_MODES.OUTPAINTING,
    ],
    resolutionPresets: defaultModelPresets,
  },
};

const getModeOptions = (imageGenModelId: string) => {
  if (imageGenModelId in modelInfo) {
    return modelInfo[imageGenModelId].supportedModes.map((mode) => ({
      value: mode,
      label: mode,
    }));
  } else {
    return [
      {
        value: GENERATION_MODES.TEXT_IMAGE,
        label: GENERATION_MODES.TEXT_IMAGE,
      },
    ];
  }
};
const getResolutionPresets = (imageGenModelId: string) => {
  if (imageGenModelId in modelInfo) {
    return modelInfo[imageGenModelId].resolutionPresets;
  } else {
    return stabilityAi2024ModelPresets;
  }
};

type StateType = {
  imageGenModelId: string;
  setImageGenModelId: (c: string) => void;
  prompt: string;
  setPrompt: (s: string) => void;
  negativePrompt: string;
  setNegativePrompt: (s: string) => void;
  resolution: { value: string; label: string };
  setResolution: (s: { value: string; label: string }) => void;
  resolutionPresets: { value: string; label: string }[];
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
  generationMode: GenerationMode;
  setGenerationMode: (s: GenerationMode) => void;
  initImage: Canvas;
  setInitImage: (s: Canvas) => void;
  maskImage: Canvas;
  setMaskImage: (s: Canvas) => void;
  maskPrompt: string;
  setMaskPrompt: (s: string) => void;
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
    resolution: {
      value: '',
      label: '',
    },
    resolutionPresets: getResolutionPresets(''),
    stylePreset: '',
    seed: [0, ...new Array(MAX_SAMPLE - 1).fill(-1)],
    step: 50,
    cfgScale: 7,
    imageStrength: 0.35,
    generationMode: modeOptions[0]['value'],
    initImage: {
      imageBase64: '',
      foregroundBase64: '',
      backgroundColor: '',
    },
    maskImage: {
      imageBase64: '',
      foregroundBase64: '',
      backgroundColor: '',
    },
    maskPrompt: '',
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
      const newResolutionPresets = getResolutionPresets(s);
      const newResolution = newResolutionPresets[0];
      const currentMode = get().generationMode;
      const availableModes = getModeOptions(s).map((option) => option.value);
      set(() => ({
        imageGenModelId: s,
        resolutionPresets: newResolutionPresets,
        resolution: newResolution,
        generationMode: availableModes.includes(currentMode)
          ? currentMode
          : availableModes[0],
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
    setResolution: (s) => {
      set(() => ({
        resolution: s,
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
    setGenerationMode: (s) => {
      set(() => ({
        generationMode: s,
      }));
    },
    setInitImage: (s) => {
      set(() => ({
        initImage: s,
      }));
    },
    setMaskImage: (s) => {
      set(() => ({
        maskImage: s,
      }));
    },
    setMaskPrompt: (s) => {
      set(() => ({
        maskPrompt: s,
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
    resolution,
    setResolution,
    resolutionPresets,
    stylePreset,
    setStylePreset,
    seed,
    setSeed,
    step,
    setStep,
    cfgScale,
    setCfgScale,
    generationMode,
    setGenerationMode,
    initImage,
    setInitImage,
    maskImage,
    setMaskImage,
    maskPrompt,
    setMaskPrompt,
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
    updateSystemContextByModel,
  } = useChat(pathname);

  const [generating, setGenerating] = useState(false);
  const [isOpenSketch, setIsOpenSketch] = useState(false);
  const [isOpenMask, setIsOpenMask] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const { modelIds, imageGenModelIds, imageGenModels } = MODELS;
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);
  const [width, height] = useMemo(() => {
    return resolution.label.split('x').map((v) => Number(v));
  }, [resolution]);

  const maskMode = useMemo(() => {
    return (
      generationMode === GENERATION_MODES.INPAINTING ||
      generationMode === GENERATION_MODES.OUTPAINTING
    );
  }, [generationMode]);
  const maskPromptSupported = useMemo(() => {
    // TODO: Remove Hard Coding
    return (
      imageGenModelId === TITAN_MODELS.V1 || imageGenModelId === TITAN_MODELS.V2
    );
  }, [imageGenModelId]);

  const modeOptions = useMemo(
    () => getModeOptions(imageGenModelId),
    [imageGenModelId]
  );
  useEffect(() => {
    const availableModes = getModeOptions(imageGenModelId).map(
      (option) => option.value
    );
    if (!availableModes.includes(generationMode)) {
      setGenerationMode(availableModes[0]);
    }
  }, [imageGenModelId, generationMode, setGenerationMode]);

  useEffect(() => {
    updateSystemContextByModel();
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [prompter]);

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

      const modelConfig = modelInfo[imageGenModelId];
      if (!modelConfig) {
        console.error(`Unknown model: ${imageGenModelId}`);
        setGenerating(false);
        return;
      }

      const promises = new Array(imageSample).fill('').map((_, idx) => {
        let _seed = seed[idx];
        if (_seed < 0) {
          const rand = generateRandomSeed();
          setSeed(rand, idx);
          _seed = rand;
        }

        let params: GenerateImageParams = {
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
          width: width,
          height: height,
          cfgScale,
          seed: _seed,
          step,
          stylePreset: _stylePreset ?? stylePreset,
        };

        if (generationMode === GENERATION_MODES.IMAGE_VARIATION) {
          params = {
            ...params,
            initImage: initImage.imageBase64,
            imageStrength,
          };
        } else if (
          generationMode === GENERATION_MODES.INPAINTING ||
          generationMode === GENERATION_MODES.OUTPAINTING
        ) {
          params = {
            ...params,
            initImage: initImage.imageBase64,
            maskPrompt: maskImage.imageBase64 ? undefined : maskPrompt,
            maskImage: maskImage.imageBase64,
            maskMode: generationMode,
          };
        }

        // 解像度の設定
        if (modelConfig.resolutionPresets[0].value.includes(':')) {
          params = {
            ...params,
            aspectRatio: resolution.value,
          };
        }

        return generate(
          params,
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
      width,
      height,
      imageSample,
      imageStrength,
      generationMode,
      initImage,
      maskPrompt,
      maskImage,
      seed,
      setImage,
      setImageError,
      setSeed,
      step,
      stylePreset,
      resolution.value,
    ]
  );

  const isImageVariationSupported = useMemo(() => {
    const availableModes = getModeOptions(imageGenModelId).map(
      (option) => option.value
    );
    return availableModes.includes(GENERATION_MODES.IMAGE_VARIATION);
  }, [imageGenModelId]);

  const onClickRandomSeed = useCallback(() => {
    setSeed(generateRandomSeed(), selectedImageIndex);
  }, [generateRandomSeed, selectedImageIndex, setSeed]);

  const onChangeInitImageBase64 = useCallback(
    (s: Canvas) => {
      setInitImage(s);
      setIsOpenSketch(false);
    },
    [setInitImage]
  );

  const onChangeMaskImageBase64 = useCallback(
    (s: Canvas) => {
      setMaskImage(s);
      setIsOpenMask(false);
    },
    [setMaskImage]
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

  const generateImageVariant = useCallback(() => {
    if (image[selectedImageIndex].base64) {
      if (generationMode === GENERATION_MODES.TEXT_IMAGE) {
        setGenerationMode(GENERATION_MODES.IMAGE_VARIATION);
      }
      const img = `data:image/png;base64,${image[selectedImageIndex].base64}`;
      setInitImage({
        imageBase64: img,
        foregroundBase64: img,
        backgroundColor: '',
      });
      setDetailExpanded(true);
    }
  }, [
    image,
    generationMode,
    selectedImageIndex,
    setGenerationMode,
    setInitImage,
    setDetailExpanded,
  ]);

  const clearAll = useCallback(() => {
    setSelectedImageIndex(0);
    clear();
    clearChat();
  }, [clear, clearChat]);

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <ModalDialog
        isOpen={isOpenSketch}
        title="Initial image setting"
        className="w-[530px]"
        help="It is used as the initial state for image generation. An image similar to the specified image will be generated."
        onClose={() => {
          setIsOpenSketch(false);
        }}>
        <SketchPad
          width={width}
          height={height}
          image={initImage}
          onChange={onChangeInitImageBase64}
          onCancel={() => {
            setIsOpenSketch(false);
          }}
        />
      </ModalDialog>
      <ModalDialog
        isOpen={isOpenMask}
        title="Mask image setting"
        className="w-[530px]"
        help="It is used as a mask for image generation. The masked area (Inpaint) or the outside (Outpaint) is generated."
        onClose={() => {
          setIsOpenMask(false);
        }}>
        <SketchPad
          width={width}
          height={height}
          image={maskImage}
          background={initImage}
          maskMode={true}
          onChange={onChangeMaskImageBase64}
          onCancel={() => {
            setIsOpenMask(false);
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
              className="min-h-60 min-w-60 max-w-lg"
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
            <Button
              title="Generate Variant"
              outlined
              className="mt-3 size-10"
              disabled={
                !image[selectedImageIndex].base64 || !isImageVariationSupported
              }
              onClick={generateImageVariant}>
              <PiNotePencil></PiNotePencil>
            </Button>
          </div>

          <Textarea
            label="Prompt"
            help="Please describe the image you want to generate. List words, not sentences."
            value={prompt}
            onChange={setPrompt}
            maxHeight={60}
            rows={2}
          />

          <Textarea
            label="Negative prompt"
            help="Please list any elements you do not want to generate or exclude. List them as individual words, not sentences."
            value={negativePrompt}
            onChange={setNegativePrompt}
            maxHeight={60}
            rows={2}
          />

          <div className="grid w-full grid-cols-2 gap-2">
            <Select
              label="Model"
              value={imageGenModelId}
              onChange={setImageGenModelId}
              options={imageGenModelIds.map((m) => {
                return { value: m, label: m };
              })}
            />
            <Select
              label="Size"
              value={resolution.value}
              onChange={(value: string) => {
                const selectedResolution = resolutionPresets.find(
                  (option: StateType['resolution']) => option.value === value
                );
                if (selectedResolution) {
                  setResolution(selectedResolution);
                }
              }}
              options={resolutionPresets}
              fullWidth
            />
          </div>

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
                help="This is the seed value for random numbers. Specifying the same seed value will generate the same image."
              />
              <ButtonIcon
                className="absolute -top-0.5 right-[8.2rem]"
                onClick={onClickRandomSeed}>
                <PiDiceFive />
              </ButtonIcon>
            </div>

            <RangeSlider
              className="col-span-2 lg:col-span-1"
              label="Number of images generated"
              min={1}
              max={7}
              value={imageSample}
              onChange={setImageSample}
              help="Generates the specified number of images simultaneously while randomly setting the seed."
            />
          </div>

          <ExpandableField
            label="Advanced parameters"
            overrideExpanded={detailExpanded}
            setOverrideExpanded={setDetailExpanded}>
            <div className="grid grid-cols-2 gap-2 pt-4">
              <div className="col-span-2 flex flex-col items-stretch justify-start lg:col-span-1">
                <Select
                  label="GenerationMode"
                  options={modeOptions}
                  value={generationMode}
                  onChange={(v) => setGenerationMode(v as GenerationMode)}
                  fullWidth
                />
                <div className="mb-2 flex flex-row justify-center gap-2 lg:flex-col xl:flex-row">
                  {generationMode !== GENERATION_MODES.TEXT_IMAGE && (
                    <div className="flex flex-col items-center">
                      <div className="mb-1 flex items-center text-sm font-bold">
                        Initial image
                        <Help
                          className="ml-1"
                          position="center"
                          message="It is used as the initial state for image generation. An image similar to the specified image will be generated."
                        />
                      </div>
                      <Base64Image
                        className="size-32"
                        imageBase64={initImage.imageBase64}
                      />
                      <Button
                        className="m-auto mt-2 text-sm"
                        onClick={() => {
                          setIsOpenSketch(true);
                        }}>
                        <PiFileArrowUp className="mr-2" />
                        Set
                      </Button>
                    </div>
                  )}
                  {maskMode && (
                    <div className="flex flex-col items-center">
                      <div className="mb-1 flex items-center text-sm font-bold">
                        Mask image
                        <Help
                          className="ml-1"
                          position="center"
                          message="It is used as a mask for image generation. The masked area (Inpaint) or the outside (Outpaint) is generated."
                        />
                      </div>
                      <Base64Image
                        className="size-32"
                        imageBase64={maskImage.imageBase64}
                      />
                      <Button
                        className="m-auto mt-2 text-sm"
                        disabled={!!maskPrompt}
                        onClick={() => {
                          setIsOpenMask(true);
                        }}>
                        <PiFileArrowUp className="mr-2" />
                        Set
                      </Button>
                    </div>
                  )}
                </div>
                {maskMode && maskPromptSupported && (
                  <Textarea
                    label="Mask prompt"
                    help="Please list the elements you want to inpaint (mask/exclude) and the elements you want to outpaint (keep/retain). List them as individual words, not sentences. Cannot be used in conjunction with mask images."
                    value={maskPrompt}
                    onChange={setMaskPrompt}
                    maxHeight={60}
                    rows={2}
                    className="w-full"
                    disabled={!!maskImage.imageBase64}
                  />
                )}
              </div>

              <div className="col-span-2 flex flex-col items-center justify-start lg:col-span-1">
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
                  help="The higher this value, the more faithful the image generated will be to the prompt."
                />

                <RangeSlider
                  className="w-full"
                  label="Step"
                  min={10}
                  max={50}
                  value={step}
                  onChange={setStep}
                  help="This is the number of iterations for image generation. The more steps, the more refined the image will be, but it will take longer to generate."
                />

                {generationMode === GENERATION_MODES.IMAGE_VARIATION && (
                  <RangeSlider
                    className="w-full"
                    label="ImageStrength"
                    min={0}
                    max={1}
                    step={0.01}
                    value={imageStrength}
                    onChange={setImageStrength}
                    help="The closer to 1, the more similar the generated image will be to the initial image, and the closer to 0, the more different the generated image will be from the initial image."
                  />
                )}
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
              loading={generating || loadingChat}
              disabled={
                prompt.length === 0 ||
                (generationMode !== GENERATION_MODES.TEXT_IMAGE &&
                  !initImage.imageBase64) ||
                ((generationMode === GENERATION_MODES.INPAINTING ||
                  generationMode === GENERATION_MODES.OUTPAINTING) &&
                  !maskImage.imageBase64 &&
                  !maskPrompt)
              }>
              Generate
            </Button>

            <Button
              className="h-8 w-full"
              outlined
              onClick={() => {
                clearAll();
              }}
              disabled={generating || loadingChat}>
              Clear
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateImagePage;
