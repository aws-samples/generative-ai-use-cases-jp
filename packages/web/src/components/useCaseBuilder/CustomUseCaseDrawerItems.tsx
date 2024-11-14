import { UseCaseAsOutput } from 'generative-ai-use-cases-jp';
import React, { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import { PiStarFill } from 'react-icons/pi';

type Props = {
  useCases: UseCaseAsOutput[];
};

const CustomUseCaseDrawerItems: React.FC<Props> = (props) => {
  const { useCaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const onClick = useCallback(
    (useCaseId: string) => {
      navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${useCaseId}`);
    },
    [navigate]
  );

  return (
    <div>
      {props.useCases.map((usecase) => {
        return (
          <div
            key={usecase.useCaseId}
            className={`${location.pathname.startsWith(`${ROUTE_INDEX_USE_CASE_BUILDER}/execute/`) && useCaseId === usecase.useCaseId ? 'bg-aws-sky' : ''} hover:bg-aws-sky my-1 flex cursor-pointer items-center gap-2 rounded p-1`}
            onClick={() => {
              onClick(usecase.useCaseId);
            }}>
            <PiStarFill
              className={`${usecase.isFavorite ? 'text-aws-smile' : 'text-transparent'}`}
            />
            {usecase.title}
          </div>
        );
      })}
    </div>
  );
};

export default CustomUseCaseDrawerItems;
