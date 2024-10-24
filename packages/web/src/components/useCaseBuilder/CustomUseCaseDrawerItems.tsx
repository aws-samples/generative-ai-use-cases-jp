import { CustomUseCaseMeta } from 'generative-ai-use-cases-jp';
import React from 'react';

type Props = {
  useCases: CustomUseCaseMeta[];
};

const CustomUseCaseDrawerItems: React.FC<Props> = (props) => {
  return (
    <div>
      {props.useCases.map((usecase) => {
        return (
          <div
            key={usecase.useCaseId}
            className="hover:bg-aws-sky cursor-pointer rounded px-2 py-1">
            {usecase.title}
          </div>
        );
      })}
    </div>
  );
};

export default CustomUseCaseDrawerItems;
