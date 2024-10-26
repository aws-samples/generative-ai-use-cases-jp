import { CustomUseCaseMeta } from 'generative-ai-use-cases-jp';
import React, { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';

type Props = {
  useCases: CustomUseCaseMeta[];
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
            className={`${location.pathname.startsWith(`${ROUTE_INDEX_USE_CASE_BUILDER}/execute/`) && useCaseId === usecase.useCaseId ? 'bg-aws-sky' : ''} hover:bg-aws-sky cursor-pointer rounded px-2 py-1`}
            onClick={() => {
              onClick(usecase.useCaseId);
            }}>
            {usecase.title}
          </div>
        );
      })}
    </div>
  );
};

export default CustomUseCaseDrawerItems;
