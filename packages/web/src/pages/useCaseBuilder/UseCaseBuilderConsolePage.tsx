import React, { useMemo, useState } from 'react';
import Card from '../../components/Card';
import { CustomUseCaseMeta } from 'generative-ai-use-cases-jp';
import ButtonIcon from '../../components/ButtonIcon';
import {
  PiLinkBold,
  PiLockKey,
  PiPencilLine,
  PiPlus,
  PiStar,
  PiStarFill,
  PiTrash,
} from 'react-icons/pi';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import ModalDialog from '../../components/ModalDialog';
import Switch from '../../components/Switch';
import InputText from '../../components/InputText';
import ButtonCopy from '../../components/ButtonCopy';
import Tabs from '../../components/Tabs';
import RowItem from '../../components/RowItem';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import ModalDialogDeleteUseCase from '../../components/useCaseBuilder/ModalDialogDeleteUseCase';
import Skeleton from '../../components/Skeleton';

const UseCaseBuilderConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    myUseCases,
    isLoadingMyUseCases,
    favoriteUseCases,
    isLoadingFavoriteUseCases,
    deleteUseCase,
    toggleFavorite,
    toggleShared,
  } = useMyUseCases();

  const [isOpenConfirmDelete, setIsOpenConfirmDelete] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(-1);

  const [isOpenShareUseCase, setIsOpenShareUseCase] = useState(false);
  const [shareTargetIndex, setShareTargetIndex] = useState(-1);

  const deleteTargetUseCase = useMemo<CustomUseCaseMeta | null>(() => {
    return myUseCases[deleteTargetIndex] ?? null;
  }, [deleteTargetIndex, myUseCases]);

  const shareTargetUseCase = useMemo<CustomUseCaseMeta | null>(() => {
    return myUseCases[shareTargetIndex] ?? null;
  }, [shareTargetIndex, myUseCases]);

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
      <ModalDialog
        isOpen={isOpenShareUseCase}
        title="共有"
        onClose={() => {
          setIsOpenShareUseCase(false);
        }}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Switch
              checked={shareTargetUseCase?.hasShared ?? false}
              label=""
              onSwitch={() => {
                toggleShared(shareTargetUseCase?.useCaseId ?? '');
              }}
            />
            {shareTargetUseCase?.hasShared
              ? 'このユースケースは共有されています。共有URLにアクセスすることで、他のユーザーも利用できます。'
              : '共有を有効化すると、あなた以外もユースケースを利用できるようになります。'}
          </div>
          {shareTargetUseCase?.hasShared && (
            <div className="flex grow ">
              <InputText
                className="grow"
                label="共有URL"
                value={`${window.location}/execute/${shareTargetUseCase.useCaseId}`}
              />
              <ButtonCopy
                className="ml-2 mt-4"
                text={`${window.location}/execute/${shareTargetUseCase.useCaseId}`}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setIsOpenShareUseCase(false);
              }}>
              OK
            </Button>
          </div>
        </div>
      </ModalDialog>
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
                    {myUseCases.map((useCase, idx) => {
                      return (
                        <div
                          key={useCase.useCaseId}
                          className="flex justify-between border-b hover:bg-gray-100">
                          <div className="flex grow items-center">
                            <ButtonIcon
                              className={`p-2 ${useCase.isFavorite ? 'text-aws-smile' : ''}`}
                              onClick={() => {
                                toggleFavorite(useCase.useCaseId);
                              }}>
                              {useCase.isFavorite ? <PiStarFill /> : <PiStar />}
                            </ButtonIcon>
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
                            <ButtonIcon
                              className=""
                              onClick={() => {
                                navigate(
                                  `${ROUTE_INDEX_USE_CASE_BUILDER}/edit/${useCase.useCaseId}`
                                );
                              }}>
                              <PiPencilLine />
                            </ButtonIcon>

                            <Button
                              outlined
                              className={`text-xs ${useCase.hasShared ? 'font-bold' : ''}`}
                              onClick={() => {
                                setShareTargetIndex(idx);
                                setIsOpenShareUseCase(true);
                              }}>
                              {useCase.hasShared ? (
                                <>
                                  <PiLinkBold className="mr-2" />
                                  共有中
                                </>
                              ) : (
                                <>
                                  <PiLockKey className="mr-2" />
                                  非公開
                                </>
                              )}
                            </Button>

                            <ButtonIcon
                              className="text-red-600"
                              onClick={() => {
                                setDeleteTargetIndex(idx);
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
          ]}
        />
      </div>
    </>
  );
};

export default UseCaseBuilderConsolePage;
