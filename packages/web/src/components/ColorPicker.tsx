import React from 'react';
import { SketchPicker, SketchPickerProps } from 'react-color';

const ColorPicker: React.FC<SketchPickerProps> = (props) => {
  return (
    <SketchPicker
      color={props.color ? props.color : '#000'}
      // onChangeComplete={onChangeColorComplete}
      // onChange={onChangeColor}
    />
  );
};

export default ColorPicker;
