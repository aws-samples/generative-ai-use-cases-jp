import React, { useCallback, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { create } from 'zustand';
import RangeSlider from '../components/RangeSlider';
import Select from '../components/Select';
import { PiFileArrowUp, PiImageLight } from 'react-icons/pi';
import useImage from '../hooks/useImage';
import GenerateImageAssistant from '../components/GenerateImageAssistant';
import SketchPad from '../components/SketchPad';
import ModalDialog from '../components/ModalDialog';
import { produce } from 'immer';
import Help from '../components/Help';

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
  imageBase64: string[];
  clearImageBase64: () => void;
  setImageBase64: (index: number, s: string) => void;
};

const useGenerateImagePageState = create<StateType>((set, get) => {
  return {
    prompt: '',
    setPrompt: (s) => {
      set(() => ({
        prompt: s,
      }));
    },
    negativePrompt: '',
    setNegativePrompt: (s) => {
      set(() => ({
        negativePrompt: s,
      }));
    },
    stylePreset: '',
    setStylePreset: (s) => {
      set(() => ({
        stylePreset: s,
      }));
    },
    seed: [0, ...new Array(MAX_SAMPLE - 1).fill(-1)],
    setSeed: (n, idx) => {
      set(() => ({
        seed: produce(get().seed, (draft) => {
          draft[idx] = n;
        }),
      }));
    },
    step: 50,
    setStep: (n) => {
      set(() => ({
        step: n,
      }));
    },
    cfgScale: 7,
    setCfgScale: (n) => {
      set(() => ({
        cfgScale: n,
      }));
    },
    imageStrength: 0.35,
    setImageStrength: (n) => {
      set(() => ({
        imageStrength: n,
      }));
    },
    initImageBase64: '',
    setInitImageBase64: (s) => {
      set(() => ({
        initImageBase64: s,
      }));
    },
    imageSample: 3,
    setImageSample: (n) => {
      set(() => ({
        imageSample: n,
      }));
    },
    imageBase64: new Array(MAX_SAMPLE).fill(''),
    setImageBase64: (index, s) => {
      set(() => ({
        imageBase64: produce(get().imageBase64, (draft) => {
          draft.splice(index, 1, s);
        }),
      }));
    },
    clearImageBase64: () => {
      set(() => ({
        imageBase64: new Array(MAX_SAMPLE).fill(''),
      }));
    },
  };
});

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
  // MEMO: LandingPage のデモデータ設定は GenerateImageAssistant.tsx で実施しています

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
    imageBase64,
    setImageBase64,
    clearImageBase64,
    imageSample,
    setImageSample,
    imageStrength,
    setImageStrength,
  } = useGenerateImagePageState();

  const { generate } = useImage();
  const [generating, setGenerating] = useState(false);
  const [isOpenSketch, setIsOpenSketch] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const generateRandomSeed = useCallback(() => {
    return Math.floor(Math.random() * 4294967295);
  }, []);

  const onClickGenerate = useCallback(
    (_prompt: string, _negativePrompt: string) => {
      clearImageBase64();
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
          stylePreset,
          initImage: initImageBase64,
          imageStrength: imageStrength,
        }).then((res) => {
          setImageBase64(idx, res);
        });
      });

      Promise.all(promises).finally(() => {
        setGenerating(false);
      });
    },
    [
      cfgScale,
      clearImageBase64,
      generate,
      generateRandomSeed,
      imageSample,
      imageStrength,
      initImageBase64,
      seed,
      setImageBase64,
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

  return (
    <>
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

      <div className="grid grid-cols-12">
        <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
          画像生成
        </div>

        <div className="col-span-12 col-start-1 m-2 ">
          <Card>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-7 col-start-1">
                <div className="h-3/5 w-full">
                  <GenerateImageAssistant
                    isGeneratingImage={generating}
                    onGetPrompt={(p, np) => {
                      setSelectedImageIndex(0);
                      setPrompt(p);
                      setNegativePrompt(np);
                      onClickGenerate(p, np);
                    }}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <div className="w-3/4">
                    <Textarea
                      label="プロンプト"
                      help="生成したい画像の説明を記載してください。文章ではなく、単語の羅列で記載します。"
                      value={prompt}
                      onChange={setPrompt}
                      maxHeight={84}
                      rows={3}
                    />

                    <Textarea
                      label="ネガティブプロンプト"
                      help="生成したくない要素、排除したい要素を記載してください。文章ではなく、単語の羅列で記載します。"
                      value={negativePrompt}
                      onChange={setNegativePrompt}
                      maxHeight={84}
                      rows={3}
                    />
                  </div>
                  <div className="w-1/4">
                    <div className="mt-3 flex flex-col items-center">
                      <Button
                        className="mb-3 h-12 w-full text-lg"
                        onClick={() => {
                          setSelectedImageIndex(0);
                          onClickGenerate(prompt, negativePrompt);
                        }}
                        loading={generating}>
                        生成
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 col-span-5 col-start-8">
                <div className="flex justify-center">
                  <div className="my-3 flex h-72 w-72 items-center justify-center rounded border border-black/30 p-3">
                    {!imageBase64[selectedImageIndex] ||
                    imageBase64[selectedImageIndex] === '' ? (
                      <>
                        {generating ? (
                          <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                        ) : (
                          <PiImageLight className="h-3/4 w-3/4 text-gray-300" />
                        )}
                      </>
                    ) : (
                      <img
                        src={`data:image/jpg;base64,${imageBase64[selectedImageIndex]}`}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                </div>
                <div className="mb-3 flex h-16 justify-center gap-3">
                  {imageBase64.map((image, idx) => (
                    <React.Fragment key={idx}>
                      {idx < imageSample && (
                        <div
                          className={`${
                            idx === selectedImageIndex ? 'ring-1' : ''
                          } flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-black/30 hover:brightness-50`}
                          onClick={() => {
                            onSelectImage(idx);
                          }}>
                          {!image || image === '' ? (
                            <>
                              {generating ? (
                                <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                              ) : (
                                <PiImageLight className="h-full w-full text-gray-300" />
                              )}
                            </>
                          ) : (
                            <img
                              src={`data:image/jpg;base64,${image}`}
                              className="h-full w-full"
                            />
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <Card label="パラメータ" className="mt-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex">
                      <div>
                        <RangeSlider
                          label="画像生成数"
                          min={1}
                          max={7}
                          value={imageSample}
                          onChange={setImageSample}
                          help="Seed をランダム設定しながら画像を指定の数だけ同時に生成します。"
                        />
                        <Select
                          label="StylePreset"
                          options={stylePresetOptions}
                          value={stylePreset}
                          onChange={setStylePreset}
                          clearable
                        />
                      </div>
                      <div className="m-auto -mt-10 pl-6">
                        <div className="mb-1 flex items-center text-sm font-bold">
                          初期画像
                          <Help
                            className="ml-1"
                            text="画像生成の初期状態となる画像を設定できます。初期画像を設定することで、初期画像に近い画像を生成するように誘導できます。"
                          />
                        </div>
                        {initImageBase64 ? (
                          <div className="mb-2">
                            <img
                              src={initImageBase64}
                              className=" h-32 w-32 border border-gray-400"></img>
                          </div>
                        ) : (
                          <>
                            <PiImageLight className="h-32 w-32 border border-gray-400 text-gray-300" />
                          </>
                        )}
                        <Button
                          className="m-auto mt-1"
                          onClick={() => {
                            setIsOpenSketch(true);
                          }}>
                          <PiFileArrowUp className="mr-2" />
                          設定
                        </Button>
                      </div>
                    </div>

                    <RangeSlider
                      label="Seed"
                      min={0}
                      max={4294967295}
                      value={seed[selectedImageIndex]}
                      onChange={(n) => {
                        setSeed(n, selectedImageIndex);
                      }}
                      help="乱数のシード値です。同じシード値を指定すると同じ画像が生成されます。"
                    />
                    <div className="flex w-full justify-end">
                      <Button onClick={onClickRandomSeed}>
                        Seed をランダム設定
                      </Button>
                    </div>

                    <RangeSlider
                      label="CFG Scale"
                      min={0}
                      max={30}
                      value={cfgScale}
                      onChange={setCfgScale}
                      help="この値が高いほどプロンプトに対して忠実な画像を生成します。"
                    />

                    <RangeSlider
                      label="Step"
                      min={10}
                      max={150}
                      value={step}
                      onChange={setStep}
                      help="画像生成の反復回数です。Step 数が多いほど画像が洗練されますが、生成に時間がかかります。"
                    />

                    <RangeSlider
                      label="ImageStrength"
                      min={0}
                      max={1}
                      step={0.01}
                      value={imageStrength}
                      onChange={setImageStrength}
                      help="1に近いほど「初期画像」に近い画像が生成され、0に近いほど「初期画像」とは異なる画像が生成されます。"
                    />
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default GenerateImagePage;
