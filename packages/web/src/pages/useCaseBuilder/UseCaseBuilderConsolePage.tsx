import React, { useMemo, useState } from 'react';
import Card from '../../components/Card';
import { CustomUseCaseMeta } from 'generative-ai-use-cases-jp';
import ButtonIcon from '../../components/ButtonIcon';
import { PiPencilLine, PiPlus, PiTrash } from 'react-icons/pi';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import Tabs from '../../components/Tabs';
import RowItem from '../../components/RowItem';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import ModalDialogDeleteUseCase from '../../components/useCaseBuilder/ModalDialogDeleteUseCase';
import Skeleton from '../../components/Skeleton';
import ModalDialogShareUseCase from '../../components/useCaseBuilder/ModalDialogShareUseCase';
import ButtonFavorite from '../../components/useCaseBuilder/ButtonFavorite';
import ButtonShare from '../../components/useCaseBuilder/ButtonShare';
import ButtonUseCaseEdit from '../../components/useCaseBuilder/ButtonUseCaseEdit';

const UseCaseBuilderConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    myUseCases,
    isLoadingMyUseCases,
    favoriteUseCases,
    isLoadingFavoriteUseCases,
    recentlyUsedUseCases,
    isLoadingRecentlyUsedUseCases,
    deleteUseCase,
    toggleFavorite,
    toggleShared,
  } = useMyUseCases();

  const [isOpenConfirmDelete, setIsOpenConfirmDelete] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isOpenShareUseCase, setIsOpenShareUseCase] = useState(false);
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);

  const deleteTargetUseCase = useMemo<CustomUseCaseMeta | null>(() => {
    return deleteTargetId
      ? (myUseCases.find((uc) => uc.useCaseId === deleteTargetId) ?? null)
      : null;
  }, [deleteTargetId, myUseCases]);

  const shareTargetUseCase = useMemo<CustomUseCaseMeta | null>(() => {
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
        hasShared={shareTargetUseCase?.hasShared ?? false}
        useCaseId={shareTargetUseCase?.useCaseId ?? ''}
        onToggleShared={() => {
          toggleShared(shareTargetUseCase?.useCaseId ?? '');
        }}
        onClose={() => {
          setIsOpenShareUseCase(false);
        }}
      />

      <div className="flex h-screen flex-col gap-4 p-4">
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:h-min print:visible print:h-min">
          ユースケースビルダーコンソール
        </div>
        <Tabs
          tabs={[
            {
              id: 'myUseCases',
              label: 'マイユースケース',
              content: (
                <Card className="h-[calc(100vh-10rem)]">
                  <RowItem className="flex items-center justify-between">
                    <div className="font-semibold">マイユースケース</div>
                    <div>
                      <Button
                        onClick={() => {
                          navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}/new`);
                        }}>
                        <PiPlus className="mr-2" />
                        ユースケース追加
                      </Button>
                    </div>
                  </RowItem>
                  <div className="h-[calc(100%-2rem)] overflow-y-scroll rounded border">
                    {isLoadingMyUseCases && (
                      <div className="flex flex-col gap-2 p-2">
                        {new Array(10).fill('').map((_, idx) => (
                          <Skeleton key={idx} />
                        ))}
                      </div>
                    )}
                    {!isLoadingMyUseCases && myUseCases.length === 0 && (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                        マイユースケースがありません。
                      </div>
                    )}
                    {myUseCases.map((useCase) => {
                      return (
                        <div
                          key={useCase.useCaseId}
                          className="flex justify-between border-b hover:bg-gray-100">
                          <div className="flex grow items-center">
                            <ButtonFavorite
                              isFavorite={useCase.isFavorite}
                              onClick={() => {
                                toggleFavorite(useCase.useCaseId);
                              }}
                            />
                            <div
                              className="flex h-full grow cursor-pointer  items-center text-sm font-bold"
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
                              hasShared={useCase.hasShared}
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
                </Card>
              ),
            },
            {
              id: 'favorite',
              label: 'お気に入り',
              content: (
                <Card label="お気に入り一覧" className="h-[calc(100vh-10rem)]">
                  <div className="h-[calc(100%-2rem)] overflow-y-scroll rounded border">
                    {isLoadingFavoriteUseCases && (
                      <div className="flex flex-col gap-2 p-2">
                        {new Array(10).fill('').map((_, idx) => (
                          <Skeleton key={idx} />
                        ))}
                      </div>
                    )}
                    {!isLoadingFavoriteUseCases &&
                      favoriteUseCases.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                          お気に入り登録されていません。
                        </div>
                      )}
                    {favoriteUseCases.map((useCase) => {
                      return (
                        <div
                          key={useCase.useCaseId}
                          className="flex justify-between border-b hover:bg-gray-100">
                          <div className="flex grow items-center pl-2">
                            <div
                              className="flex h-full grow cursor-pointer  items-center text-sm font-bold"
                              onClick={() => {
                                navigate(
                                  `${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${useCase.useCaseId}`
                                );
                              }}>
                              {useCase.title}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2">
                            {useCase.isMyUseCase && (
                              <ButtonIcon
                                className=""
                                onClick={() => {
                                  navigate(
                                    `${ROUTE_INDEX_USE_CASE_BUILDER}/edit/${useCase.useCaseId}`
                                  );
                                }}>
                                <PiPencilLine />
                              </ButtonIcon>
                            )}

                            <Button
                              outlined
                              className="text-xs"
                              onClick={() => {
                                toggleFavorite(useCase.useCaseId);
                              }}>
                              お気に入りを解除
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ),
            },
            {
              id: 'resentlyUsed',
              label: '最近利用したユースケース',
              content: (
                <Card className="h-[calc(100vh-10rem)]">
                  <RowItem className="flex items-center justify-between">
                    <div className="font-semibold">
                      最近利用したユースケース
                    </div>
                  </RowItem>
                  <div className="h-[calc(100%-2rem)] overflow-y-scroll rounded border">
                    {isLoadingRecentlyUsedUseCases && (
                      <div className="flex flex-col gap-2 p-2">
                        {new Array(10).fill('').map((_, idx) => (
                          <Skeleton key={idx} />
                        ))}
                      </div>
                    )}
                    {!isLoadingRecentlyUsedUseCases &&
                      recentlyUsedUseCases.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                          最近利用したユースケースがありません。
                        </div>
                      )}
                    {recentlyUsedUseCases.map((useCase) => {
                      return (
                        <div
                          key={useCase.useCaseId}
                          className="flex justify-between border-b hover:bg-gray-100">
                          <div className="flex grow items-center">
                            <ButtonFavorite
                              isFavorite={useCase.isFavorite}
                              onClick={() => {
                                toggleFavorite(useCase.useCaseId);
                              }}
                            />
                            <div
                              className="flex h-full grow cursor-pointer  items-center text-sm font-bold"
                              onClick={() => {
                                navigate(
                                  `${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${useCase.useCaseId}`
                                );
                              }}>
                              {useCase.title}
                            </div>
                          </div>
                          {useCase.isMyUseCase && (
                            <div className="flex items-center gap-2 p-2">
                              <ButtonUseCaseEdit
                                useCaseId={useCase.useCaseId}
                              />
                              <ButtonShare
                                hasShared={useCase.hasShared}
                                onClick={() => {
                                  setShareTargetId(useCase.useCaseId);
                                  setIsOpenShareUseCase(true);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </>
  );
};

export default UseCaseBuilderConsolePage;
