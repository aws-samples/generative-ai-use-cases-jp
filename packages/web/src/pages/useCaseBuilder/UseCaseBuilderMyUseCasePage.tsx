import React, { useMemo, useState } from 'react';
import { UseCaseAsOutput } from 'generative-ai-use-cases-jp';
import ButtonIcon from '../../components/ButtonIcon';
import { PiNotePencil, PiTrash } from 'react-icons/pi';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import ModalDialogDeleteUseCase from '../../components/useCaseBuilder/ModalDialogDeleteUseCase';
import Skeleton from '../../components/Skeleton';
import ModalDialogShareUseCase from '../../components/useCaseBuilder/ModalDialogShareUseCase';
import ButtonFavorite from '../../components/useCaseBuilder/ButtonFavorite';
import ButtonShare from '../../components/useCaseBuilder/ButtonShare';
import ButtonUseCaseEdit from '../../components/useCaseBuilder/ButtonUseCaseEdit';

const UseCaseBuilderMyUseCasePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    myUseCases,
    isLoadingMyUseCases,
    deleteUseCase,
    toggleFavorite,
    toggleShared,
  } = useMyUseCases();

  const [isOpenConfirmDelete, setIsOpenConfirmDelete] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isOpenShareUseCase, setIsOpenShareUseCase] = useState(false);
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);

  const deleteTargetUseCase = useMemo<UseCaseAsOutput | null>(() => {
    return deleteTargetId
      ? (myUseCases.find((uc) => uc.useCaseId === deleteTargetId) ?? null)
      : null;
  }, [deleteTargetId, myUseCases]);

  const shareTargetUseCase = useMemo<UseCaseAsOutput | null>(() => {
    return shareTargetId
      ? (myUseCases.find((uc) => uc.useCaseId === shareTargetId) ?? null)
      : null;
  }, [shareTargetId, myUseCases]);

  return (
    <>
      <ModalDialogDeleteUseCase
        isOpen={isOpenConfirmDelete}
        targetLabel={deleteTargetUseCase?.title ?? ''}
        onClose={() => {
          setIsOpenConfirmDelete(false);
        }}
        onDelete={() => {
          if (deleteTargetUseCase) {
            setIsOpenConfirmDelete(false);
            deleteUseCase(deleteTargetUseCase.useCaseId);
          }
        }}
      />
      <ModalDialogShareUseCase
        isOpen={isOpenShareUseCase}
        isShared={shareTargetUseCase?.isShared ?? false}
        useCaseId={shareTargetUseCase?.useCaseId ?? ''}
        onToggleShared={() => {
          toggleShared(shareTargetUseCase?.useCaseId ?? '');
        }}
        onClose={() => {
          setIsOpenShareUseCase(false);
        }}
      />

      <div className="flex flex-col gap-4 p-4">
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:h-min print:visible print:h-min">
          マイユースケース
        </div>

        <div className="fixed right-2 top-2.5 lg:right-4 lg:top-3">
          <Button
            className="hidden lg:flex"
            onClick={() => {
              navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}/new`);
            }}>
            <PiNotePencil className="lg:mr-2" />
            新規作成
          </Button>
          <ButtonIcon
            className="flex text-white lg:hidden"
            onClick={() => {
              navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}/new`);
            }}>
            <PiNotePencil className="lg:mr-2" />
          </ButtonIcon>
        </div>
        <div className="">
          {isLoadingMyUseCases && (
            <div className="flex flex-col gap-2 p-2">
              {new Array(10).fill('').map((_, idx) => (
                <Skeleton key={idx} />
              ))}
            </div>
          )}
          {!isLoadingMyUseCases && myUseCases.length === 0 && (
            <div className="mt-32 flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
              マイユースケースがありません。
            </div>
          )}
          {myUseCases.map((useCase) => {
            return (
              <div
                key={useCase.useCaseId}
                className="flex justify-between border-t px-2 last:border-b hover:bg-gray-100">
                <div className="flex grow items-center">
                  <ButtonFavorite
                    isFavorite={useCase.isFavorite}
                    onClick={() => {
                      toggleFavorite(useCase.useCaseId);
                    }}
                  />
                  <div
                    className="flex h-full grow cursor-pointer items-center text-sm font-bold"
                    onClick={() => {
                      navigate(
                        `${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${useCase.useCaseId}`
                      );
                    }}>
                    {useCase.title}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2">
                  <ButtonUseCaseEdit useCaseId={useCase.useCaseId} />
                  <ButtonShare
                    isShared={useCase.isShared}
                    onClick={() => {
                      setShareTargetId(useCase.useCaseId);
                      setIsOpenShareUseCase(true);
                    }}
                  />

                  <ButtonIcon
                    className="text-red-600"
                    onClick={() => {
                      setDeleteTargetId(useCase.useCaseId);
                      setIsOpenConfirmDelete(true);
                    }}>
                    <PiTrash />
                  </ButtonIcon>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default UseCaseBuilderMyUseCasePage;
