import React, { useState } from 'react';
import { BaseProps } from '../@types/common';
import { PiArrowFatRightFill, PiCaretDown, PiX } from 'react-icons/pi';
import ButtonIcon from './ButtonIcon';
import useInterUseCases from '../hooks/useInterUseCases';

type Props = BaseProps;

const PopupInterUseCasesDemo: React.FC<Props> = () => {
  const {
    setIsShow,
    title,
    useCases,
    currentIndex,
    setCurrentIndex,
    navigateUseCase,
  } = useInterUseCases();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="fixed top-0 z-50 ml-10  w-11/12 pt-1 lg:left-1/3 lg:w-1/2 lg:p-3">
      <div className="border-aws-squid-ink/50 relative rounded border bg-white p-3 shadow-lg">
        <div className="flex w-full">
          <div
            className=" flex w-full cursor-pointer items-center rounded font-bold hover:bg-gray-200"
            onClick={() => {
              setIsOpen(!isOpen);
            }}>
            <PiCaretDown
              className={`transition ${!isOpen && 'rotate-180'} mr-2`}
            />
            {title}
          </div>
          <ButtonIcon
            className={`right-1 top-1 -m-1 `}
            onClick={() => {
              setIsShow(false);
            }}>
            <PiX />
          </ButtonIcon>
        </div>

        <div
          className={`origin-top transition ${
            isOpen ? 'visible mt-3 ' : 'h-0 scale-y-0'
          }`}>
          <div className=" grid grid-cols-3 gap-2 text-sm">
            {useCases.map((usecase, idx) => (
              <div
                key={idx}
                className={`${
                  idx === currentIndex &&
                  'border-aws-squid-ink border font-bold'
                } 
                ${
                  idx > currentIndex + 1 || idx < currentIndex - 1
                    ? 'opacity-50 hover:brightness-100'
                    : 'cursor-pointer hover:brightness-75 '
                }
                  bg-aws-smile relative mx-2  rounded p-1 px-2 text-white shadow  `}
                onClick={() => {
                  if (idx > currentIndex + 1 || idx < currentIndex - 1) {
                    return;
                  }
                  setCurrentIndex(idx);
                  navigateUseCase(idx);
                }}>
                <div>{usecase.title}</div>
                <PiArrowFatRightFill
                  className={`text-aws-squid-ink absolute -right-5 top-2 ${
                    useCases.length - 1 === idx && 'invisible'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 rounded border p-2 text-xs">
            {useCases[currentIndex].description &&
              useCases[currentIndex].description
                .split('\n')
                .map((s, idx) => <div key={idx}>{s}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupInterUseCasesDemo;
