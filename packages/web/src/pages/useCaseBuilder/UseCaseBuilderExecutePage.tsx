import React from 'react';
import Card from '../../components/Card';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import { useParams } from 'react-router-dom';
import useUseCase from '../../hooks/useCaseBuilder/useUseCase';

const UseCaseBuilderExecutePage: React.FC = () => {
  const { useCaseId } = useParams();

  const { useCase } = useUseCase(useCaseId);

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <div className="col-span-12">
        <Card>
          <AppBuilderView
            title={useCase?.title ?? '読み込み中...'}
            promptTemplate={useCase?.promptTemplate ?? ''}
          />
        </Card>
      </div>
    </div>
  );
};

export default UseCaseBuilderExecutePage;
