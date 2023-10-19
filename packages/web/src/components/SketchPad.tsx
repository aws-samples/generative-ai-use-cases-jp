import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { ColorChangeHandler, CompactPicker } from 'react-color';
import {
  PiArrowClockwise,
  PiArrowCounterClockwise,
  PiEraserFill,
  PiPaintBrushFill,
  PiPaintBucketFill,
  PiUploadSimple,
} from 'react-icons/pi';
import SignatureCanvas from 'react-signature-canvas';
import Button from './Button';
import { BaseProps } from '../@types/common';
import ModalDialog from './ModalDialog';

type SketchButtonProps = BaseProps & {
  isActive?: boolean;
  onClick: () => void;
  children: ReactNode;
};

const SketchButton: React.FC<SketchButtonProps> = (props) => {
  return (
    <div
      // eslint-disable-next-line tailwindcss/no-custom-classname
      className={`${
        props.className ?? ''
      } flex h-6 w-6 cursor-pointer items-center justify-center border ${
        props.isActive ? 'border-black/50 bg-gray-200' : ''
      }`}
      onClick={props.onClick}>
      {props.children}
    </div>
  );
};

type Props = {
  onChange: (imageBase64: string) => void;
  onCancel: () => void;
};

const SketchPad: React.FC<Props> = (props) => {
  const canvasRef = useRef<SignatureCanvas>(null);
  const [penColor, setPenColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [isEraseMode, setIsEraseMode] = useState(false);
  const [isOpenPalette, setIsOpenPalette] = useState(false);
  const [isOpenPaletteBg, setIsOpenPaletteBg] = useState(false);

  const [isOpenUpload, setIsOpenUpload] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const undoStack: SignaturePad.Point[][] = [];

  const onChangePenColor = useCallback<ColorChangeHandler>((color) => {
    setIsOpenPalette(false);
    setPenColor(color.hex);
  }, []);

  const onChangeBgColor = useCallback<ColorChangeHandler>((color) => {
    setIsOpenPaletteBg(false);
    setBgColor(color.hex);
  }, []);

  const onClickUndo = useCallback(() => {
    const data = canvasRef.current?.toData();
    if (data) {
      const undoItem = data.pop();
      if (undoItem) {
        undoStack.push(undoItem);
      }
      canvasRef.current?.fromData(data);
    }
  }, [undoStack]);

  const onClickRedo = useCallback(() => {
    const data = canvasRef.current?.toData();
    if (data) {
      const redoItem = undoStack.pop();
      if (redoItem) {
        data.push(redoItem);
        canvasRef.current?.fromData(data);
      }
    }
  }, [undoStack]);

  const onClickComplete = useCallback(() => {
    // 背景色を設定するために、新しくcanvasで四角を作成し合成する
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 512);
      const img = canvasRef.current?.getCanvas();
      if (img) {
        ctx.drawImage(img, 0, 0);
        props.onChange(canvas.toDataURL('image/png'));
      }
    }
  }, [bgColor, props]);

  const [imageBase64, setImageBase64] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = (e) => {
        console.log(e);
        const img = new Image();
        img.src = reader.result as string;

        img.onload = () => {
          // 画像を512x512にリサイズ
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 512;
          canvas.height = 512;
          ctx?.drawImage(img, 0, 0, 512, 512);

          const resizedImageDataUri = canvas.toDataURL(file.type);

          setImageBase64(resizedImageDataUri);
        };
      };
    }
  };
  const onClickUploadComplet = useCallback(() => {
    props.onChange(imageBase64);
  }, [imageBase64, props]);

  return (
    <>
      <ModalDialog isOpen={isOpenUpload} title="画像をアップロード">
        <div>
          <div className="mb-3 flex w-full">
            <input type="file" onChange={handleImageUpload} accept="image/*" />
          </div>
          <div className="flex w-full justify-center">
            {imageBase64 && <img src={imageBase64} />}
          </div>

          <div className="mt-3 flex w-full justify-end gap-3">
            <Button
              outlined
              onClick={() => {
                setIsOpenUpload(false);
              }}>
              キャンセル
            </Button>
            <Button onClick={onClickUploadComplet}>完了</Button>
          </div>
        </div>
      </ModalDialog>
      <div className="w-full">
        <div className="flex w-full justify-center">
          <SketchButton
            className="relative text-xl"
            onClick={() => {
              setIsOpenPalette(!isOpenPalette);
            }}>
            <PiPaintBrushFill style={{ color: penColor }} />
          </SketchButton>
          {isOpenPalette && (
            <CompactPicker
              className="absolute -left-6 top-7 border bg-white"
              color={penColor}
              onChangeComplete={onChangePenColor}
              onChange={onChangePenColor}
            />
          )}

          <SketchButton
            className="relative ml-1 text-xl"
            onClick={() => {
              setIsOpenPaletteBg(!isOpenPaletteBg);
            }}>
            <PiPaintBucketFill />
          </SketchButton>
          {isOpenPaletteBg && (
            <CompactPicker
              className="absolute -left-6 top-7 border bg-white"
              color={penColor}
              onChangeComplete={onChangeBgColor}
              onChange={onChangeBgColor}
            />
          )}

          <SketchButton
            className="ml-1 text-xl"
            isActive={isEraseMode}
            onClick={() => {
              setIsEraseMode(!isEraseMode);
            }}>
            <PiEraserFill />
          </SketchButton>

          <SketchButton className="ml-1 text-xl" onClick={onClickUndo}>
            <PiArrowCounterClockwise />
          </SketchButton>
          <SketchButton className="text-xl" onClick={onClickRedo}>
            <PiArrowClockwise />
          </SketchButton>
        </div>

        <div className="flex w-full justify-center">
          <SignatureCanvas
            ref={canvasRef}
            canvasProps={{
              width: 512,
              height: 512,
              className: 'border',
              style: { backgroundColor: bgColor },
            }}
            penColor={isEraseMode ? bgColor : penColor}
            dotSize={3}
            maxWidth={3}
            minWidth={3}
          />
        </div>
        <div className="mt-3 flex justify-between">
          <Button
            onClick={() => {
              setIsOpenUpload(true);
            }}>
            <PiUploadSimple />
            画像をアップロード
          </Button>
          <div className="flex gap-3">
            <Button outlined onClick={props.onCancel}>
              キャンセル
            </Button>
            <Button onClick={onClickComplete}>完了</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SketchPad;
