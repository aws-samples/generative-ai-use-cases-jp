import React, { useState } from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  src: string;
  size: number;
};

const ZoomUpImage: React.FC<Props> = (props) => {
  const [zoom, setZoom] = useState(false);

  return (
    <div className={props.className}>
      <div
        className="cursor-pointer border"
        onClick={() => {
          setZoom(true);
        }}>
        <img
          className={`w-${props.size} h-${props.size} object-cover object-center`}
          src={props.src}
        />
      </div>

      {zoom && (
        <div
          className="fixed left-0 top-0 z-[100] h-screen w-screen bg-gray-900/90"
          onClick={() => {
            setZoom(false);
          }}
        />
      )}
      {zoom && (
        <div
          className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2"
          onClick={() => {
            setZoom(false);
          }}>
          <img src={props.src} className="max-h-[90vh]" />
        </div>
      )}
    </div>
  );
};

export default ZoomUpImage;
