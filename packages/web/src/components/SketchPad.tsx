import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ColorChangeHandler, CompactPicker, CirclePicker } from 'react-color';
import {
  PiArrowClockwise,
  PiArrowCounterClockwise,
  PiCircleFill,
  PiEraserFill,
  PiPaintBrushFill,
  PiPaintBucketFill,
  PiPaletteFill,
} from 'react-icons/pi';
import SignatureCanvas from 'react-signature-canvas';
import Button from './Button';
import { BaseProps } from '../@types/common';

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

type PenWidthButtonProps = BaseProps & {
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  penWidth: number;
  onChange: (penWidth: number) => void;
};

const SIZE_LIST: PenWidthButtonProps['size'][] = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
];

const SIZE_WIDTH_MAP = {
  xs: 1,
  sm: 2,
  base: 3,
  lg: 5,
  xl: 10,
};

const PenWidthButton: React.FC<PenWidthButtonProps> = (props) => {
  const isActive = useMemo(() => {
    return SIZE_WIDTH_MAP[props.size] === props.penWidth;
  }, [props.penWidth, props.size]);

  return (
    <SketchButton
      // eslint-disable-next-line tailwindcss/no-custom-classname
      className={`text-${props.size}  `}
      isActive={isActive}
      onClick={() => {
        props.onChange(SIZE_WIDTH_MAP[props.size]);
      }}>
      <PiCircleFill />
    </SketchButton>
  );
};

type Props = {
  onChange: (imageBase64: string) => void;
};

const SketchPad: React.FC<Props> = (props) => {
  const canvasRef = useRef<SignatureCanvas>(null);
  const [penColor, setPenColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [isEraseMode, setIsEraseMode] = useState(false);
  const [isOpenPalette, setIsOpenPalette] = useState(false);
  const [isOpenPaletteBg, setIsOpenPaletteBg] = useState(false);

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

  return (
    <div>
      <div className="border">
        <div className="flex">
          {/* {SIZE_LIST.map((size) => (
            <PenWidthButton
              key={size}
              size={size}
              penWidth={penWidth}
              onChange={setPenWidth}
            />
          ))} */}

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
      </div>

      <SignatureCanvas
        // key={bgColor}
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
        // backgroundColor={bgColor}
      />
      <Button onClick={onClickComplete}>OK</Button>
    </div>
  );
};

export default SketchPad;
