import React, { useCallback, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { create } from 'zustand';
import RangeSlider from '../components/RangeSlider';
import Select from '../components/Select';
import { PiFileImage, PiImageLight } from 'react-icons/pi';
import useImage from '../hooks/useImage';
import GenerateImageAssistant from '../components/GenerateImageAssistant';
import SketchPad from '../components/SketchPad';
import ModalDialog from '../components/ModalDialog';

type StateType = {
  prompt: string;
  setPrompt: (s: string) => void;
  negativePrompt: string;
  setNegativePrompt: (s: string) => void;
  stylePreset: string;
  setStylePreset: (s: string) => void;
  seed: number;
  setSeed: (n: number) => void;
  step: number;
  setStep: (n: number) => void;
  cfgScale: number;
  setCfgScale: (n: number) => void;
  initImageBase64: string;
  setInitImageBase64: (s: string) => void;
  imageBase64: string;
  setImageBase64: (s: string) => void;
};

const useGenerateImagePageState = create<StateType>((set) => {
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
    seed: 0,
    setSeed: (n) => {
      set(() => ({
        seed: n,
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
    initImageBase64: '',
    setInitImageBase64: (s) => {
      set(() => ({
        initImageBase64: s,
      }));
    },
    imageBase64: '',
    setImageBase64: (s) => {
      set(() => ({
        imageBase64: s,
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
  } = useGenerateImagePageState();

  const { generate } = useImage();
  const [generating, setGenerating] = useState(false);
  const [isOpenSketch, setIsOpenSketch] = useState(false);

  const onClickGenerate = useCallback(() => {
    setGenerating(true);
    generate({
      textPrompt: [
        {
          text: prompt,
          weight: 1,
        },
        {
          text: negativePrompt,
          weight: -1,
        },
      ],
      cfgScale,
      seed,
      step,
      stylePreset,
      initImage: initImageBase64,
    })
      .then((res) => {
        setImageBase64(res);
      })
      .finally(() => {
        setGenerating(false);
      });
  }, [
    cfgScale,
    generate,
    initImageBase64,
    negativePrompt,
    prompt,
    seed,
    setImageBase64,
    step,
    stylePreset,
  ]);

  const onClickRandomSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 4294967295));
  }, [setSeed]);

  const onChangeInitImageBase64 = useCallback(
    (s: string) => {
      setInitImageBase64(s);
      setIsOpenSketch(false);
    },
    [setInitImageBase64]
  );

  return (
    <>
      <ModalDialog
        isOpen={isOpenSketch}
        title="初期画像の設定"
        className="w-[530px]"
        onClose={() => {
          setIsOpenSketch(false);
        }}>
        <SketchPad
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
          <Card label="生成条件">
            <div className="flex gap-3">
              <div className="w-1/2">
                <div className="flex justify-center">
                  <div className="my-3 flex h-72 w-72 items-center justify-center rounded border border-black/30 p-3">
                    {imageBase64 === '' ? (
                      <PiImageLight className="h-3/4 w-3/4 text-gray-300" />
                    ) : (
                      <img
                        src={`data:image/jpg;base64,${imageBase64}`}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                </div>

                <Card>
                  <Textarea
                    label="プロンプト"
                    value={prompt}
                    onChange={setPrompt}
                    maxHeight={128}
                    rows={5}
                  />
                  <Textarea
                    label="ネガティブプロンプト"
                    value={negativePrompt}
                    onChange={setNegativePrompt}
                    maxHeight={128}
                    rows={5}
                  />

                  {initImageBase64 && (
                    <div className="mb-2">
                      <div className="text-sm">生成元の画像</div>
                      <img
                        src={initImageBase64}
                        className=" h-32 w-32 border border-gray-400"></img>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <Button
                      onClick={() => {
                        setIsOpenSketch(true);
                      }}>
                      <PiFileImage className="mr-2" />
                      生成元の画像を設定
                    </Button>
                    <Button onClick={onClickGenerate} loading={generating}>
                      生成
                    </Button>
                  </div>
                </Card>
              </div>
              <GenerateImageAssistant
                onCopyPrompt={(p) => {
                  setPrompt(p);
                }}
                onCopyNegativePrompt={(p) => {
                  setNegativePrompt(p);
                }}
              />
            </div>

            <Card label="パラメータ" className="mt-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2 xl:col-span-1">
                  <Select
                    label="StylePreset"
                    options={stylePresetOptions}
                    value={stylePreset}
                    onChange={setStylePreset}
                    clearable
                  />
                </div>
                <div className="col-span-3 xl:col-span-2">
                  <RangeSlider
                    label="Seed"
                    min={0}
                    max={4294967295}
                    value={seed}
                    onChange={setSeed}
                  />
                </div>
                <div className="col-span-1 flex items-end xl:col-span-1 xl:items-center">
                  <Button onClick={onClickRandomSeed}>ランダム設定</Button>
                </div>
                <div className="col-span-2">
                  <RangeSlider
                    label="CFG Scale"
                    min={0}
                    max={30}
                    value={cfgScale}
                    onChange={setCfgScale}
                  />
                </div>
                <div className="col-span-2">
                  <RangeSlider
                    label="Step"
                    min={10}
                    max={150}
                    value={step}
                    onChange={setStep}
                  />
                </div>
              </div>
            </Card>
          </Card>
        </div>
      </div>
    </>
  );
};

export default GenerateImagePage;
