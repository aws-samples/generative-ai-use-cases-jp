import React, { useCallback, useState } from 'react';
import Card from '../../components/Card';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import { useParams } from 'react-router-dom';
import useUseCase from '../../hooks/useCaseBuilder/useUseCase';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import ModalDialogShareUseCase from '../../components/useCaseBuilder/ModalDialogShareUseCase';
import { produce } from 'immer';

const UseCaseBuilderExecutePage: React.FC = () => {
  const { useCaseId } = useParams();
  const [isOpenShareDialog, setIsOpenShareDialog] = useState(false);

  const { useCase, mutate, isLoading } = useUseCase(useCaseId);
  const { toggleFavorite, toggleShared } = useMyUseCases();

  const onClickToggleFavorite = useCallback(() => {
    if (useCase) {
      mutate(
        produce(useCase, (draft) => {
          draft.isFavorite = !useCase.isFavorite;
        }),
        {
          revalidate: false,
        }
      );
      toggleFavorite(useCase.useCaseId).finally(() => {
        mutate();
      });
    }
  }, [mutate, toggleFavorite, useCase]);

  const onClickToggleShared = useCallback(() => {
    if (useCase) {
      mutate(
        produce(useCase, (draft) => {
          draft.hasShared = !useCase.hasShared;
        }),
        {
          revalidate: false,
        }
      );
      toggleShared(useCase.useCaseId).finally(() => {
        mutate();
      });
    }
  }, [mutate, toggleShared, useCase]);

  return (
    <>
      <div className="grid h-screen grid-cols-12 gap-4 p-4">
        <div className="col-span-12">
          <Card>
            <ModalDialogShareUseCase
              isOpen={isOpenShareDialog}
              useCaseId={useCaseId ?? ''}
              hasShared={useCase?.hasShared ?? false}
              onToggleShared={() => {
                onClickToggleShared();
              }}
              onClose={() => {
                setIsOpenShareDialog(false);
              }}
            />
            <AppBuilderView
              title={useCase?.title ?? '読み込み中...'}
              promptTemplate={useCase?.promptTemplate ?? ''}
              hasShared={useCase?.hasShared ?? false}
              isFavorite={useCase?.isFavorite ?? false}
              useCaseId={useCaseId ?? ''}
              isLoading={isLoading}
              onToggleFavorite={() => {
                onClickToggleFavorite();
              }}
              onToggleShared={() => {
                setIsOpenShareDialog(true);
              }}
            />
          </Card>
        </div>
      </div>
    </>
  );
};

export default UseCaseBuilderExecutePage;
