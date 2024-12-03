import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../components/Card';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import { useNavigate, useParams } from 'react-router-dom';
import useUseCase from '../../hooks/useCaseBuilder/useUseCase';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import ModalDialogShareUseCase from '../../components/useCaseBuilder/ModalDialogShareUseCase';
import { produce } from 'immer';
import ModalDialog from '../../components/ModalDialog';
import Button from '../../components/Button';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import usePageTitle from '../../hooks/usePageTitle';

const UseCaseBuilderExecutePage: React.FC = () => {
  const navigate = useNavigate();
  const { useCaseId } = useParams();
  const [isOpenShareDialog, setIsOpenShareDialog] = useState(false);
  const [isOpenErrorDialog, setIsOpenErrorDialog] = useState(false);
  const { setPageTitle } = usePageTitle();

  const {
    useCase,
    mutate,
    isLoading,
    error: errorGetUseCase,
  } = useUseCase(useCaseId);
  const { toggleFavorite, toggleShared } = useMyUseCases();

  // ページタイトルの設定
  useEffect(() => {
    setPageTitle(useCase?.title ?? '');
  }, [setPageTitle, useCase?.title]);

  useEffect(() => {
    if (errorGetUseCase?.response?.status === 404) {
      setIsOpenErrorDialog(true);
    }
  }, [errorGetUseCase?.response?.status]);

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
          draft.isShared = !useCase.isShared;
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
      <ModalDialogShareUseCase
        isOpen={isOpenShareDialog}
        useCaseId={useCaseId ?? ''}
        isShared={useCase?.isShared ?? false}
        onToggleShared={() => {
          onClickToggleShared();
        }}
        onClose={() => {
          setIsOpenShareDialog(false);
        }}
      />
      <ModalDialog
        isOpen={isOpenErrorDialog}
        title="アクセスエラー"
        onClose={() => {}}>
        <div className="flex flex-col gap-2">
          <div>
            このユースケースは存在しないか、共有されていないユースケースです。
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}`);
              }}>
              TOP画面に戻る
            </Button>
          </div>
        </div>
      </ModalDialog>
      <div className="grid h-screen grid-cols-12 gap-4 p-4">
        <div className="col-span-12">
          <Card>
            <AppBuilderView
              title={useCase?.title ?? ''}
              promptTemplate={useCase?.promptTemplate ?? ''}
              description={useCase?.description}
              inputExamples={useCase?.inputExamples}
              fixedModelId={useCase?.fixedModelId ?? ''}
              isShared={useCase?.isShared ?? false}
              isFavorite={useCase?.isFavorite ?? false}
              useCaseId={useCaseId ?? ''}
              isLoading={isLoading}
              canEdit={useCase?.isMyUseCase}
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
