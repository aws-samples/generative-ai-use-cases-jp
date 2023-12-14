import React, { useState } from 'react';
import { BaseProps } from '../@types/common';
import {
  PiArrowFatRightFill,
  PiCaretDown,
  PiX,
  PiCircleFill,
  PiCheckCircleFill,
} from 'react-icons/pi';
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
    <div className="fixed top-0 z-10 ml-10 w-11/12 pt-1 lg:left-1/3 lg:w-1/2 lg:p-3">
      <div className="bg-white text-aws-squid-ink shadow-xl border">
        <div className="cursor-pointer flex items-center justify-between" onClick={() => {
          setIsOpen(!isOpen);
        }}>
          <PiCaretDown
            className={`transition ${!isOpen && 'rotate-180'} mr-2`}
          />
          {title}
          <ButtonIcon
            onClick={() => {
              setIsShow(false);
            }}>
            <PiX />
          </ButtonIcon>
        </div>

        <div className="flex items-center justify-between px-24 pb-8">
          <div className="relative">
            <PiCheckCircleFill className="text-aws-smile text-2xl bg-white z-10 cursor-pointer"/>
            <div className="absolute left-1/2 top-6 -translate-x-1/2 text-sm">
              hogehogehogehgoe
            </div>
          </div>
          <div className="border-t-4 border-aws-smile grow"/>
          <PiCheckCircleFill className="text-aws-smile text-2xl bg-white z-10 cursor-pointer"/>
          <div className="border-t-4 border-aws-smile grow"/>
          <PiCircleFill className="text-aws-smile text-2xl z-10 bg-white cursor-pointer"/>
          <div className="border-t border-gray-300 grow"/>
          <PiCircleFill className="text-aws-smile text-xl z-10 bg-white cursor-pointer"/>
          <div className="border-t border-gray-300 grow"/>
          <PiCircleFill className="text-gray-400 text-xl z-10 bg-white cursor-pointer"/>
        </div>

        {/*
        <div
          className={`origin-top transition ${
            isOpen ? 'visible' : 'h-0 scale-y-0'
          } duration-1000`}>
          <div className=" grid grid-cols-3 gap-2 text-sm bg-aws-squid-ink">
            {useCases.map((usecase, idx) => (
              <div
                key={idx}
                className={`
                ${
                  idx > currentIndex + 1 || idx < currentIndex - 1
                    ? 'bg-gray-400'
                    : 'cursor-pointer'
                }
                  bg-aws-smile text-white`}
                onClick={() => {
                  if (idx > currentIndex + 1 || idx < currentIndex - 1) {
                    return;
                  }
                  setCurrentIndex(idx);
                  navigateUseCase(idx);
                }}>
                <div>
                  {usecase.title}
                  {idx === currentIndex && (<>
                    NOW
                  </>)}
                  {idx === currentIndex + 1 && (<>
                    NEXT
                  </>)}
                </div>
                {useCases.length - 1 !== idx && (
                  <PiArrowFatRightFill className="text-white"/>
                )}
              </div>
            ))}
          </div>
          <div className="text-xs">
            {useCases[currentIndex].description &&
             useCases[currentIndex].description
                                   .split('\n')
                                   .map((s, idx) => <div key={idx}>{s}</div>)}
          </div>
        </div>
          */}
      </div>
    </div>
  );
};

export default PopupInterUseCasesDemo;
