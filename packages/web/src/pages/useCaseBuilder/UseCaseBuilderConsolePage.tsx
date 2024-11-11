import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import Card from '../../components/Card';
import { CustomUseCaseMeta } from 'generative-ai-use-cases-jp';
import ButtonIcon from '../../components/ButtonIcon';
import { PiPlus, PiTrash } from 'react-icons/pi';
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
import { useCaseBuilderSamplePrompts } from '../../prompts/useCaseBuilderSamples';

type CardSampleProps = {
  title: string;
  description: string;
  icon: ReactNode;
  category: string;
  promptTemplate: string;
};

const CardSample: React.FC<CardSampleProps> = (props) => {
  const navigate = useNavigate();

  const onClick = useCallback(() => {
    navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}/new`, {
      state: {
        title: props.title,
        promptTemplate: props.promptTemplate,
        description: props.description,
      },
    });
  }, [navigate, props.description, props.promptTemplate, props.title]);

  return (
    <div
      className="flex cursor-pointer rounded-lg border-2 p-3 hover:bg-gray-100"
      onClick={onClick}>
      <div className="flex items-center">
        <div className="bg-aws-sky  text-color-auto rounded-xl border p-2 text-3xl  shadow-md">
          {props.icon}
        </div>
        <div className="ml-2 flex flex-col">
          <div className="font-bold">{props.title}</div>
          <div className="text-sm text-gray-600 ">{props.description}</div>
          <div className="flex">
            <div className="mt-1 rounded bg-gray-200 p-1 text-xs font-semibold">
              {props.category}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UseCaseBuilderConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    myUseCases,
    isLoadingMyUseCases,
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
              id: 'samples',
              label: 'サンプル集',
              content: (
                <div className="h-[calc(100vh-10rem)] overflow-y-scroll rounded border p-2">
                  <div className="grid grid-cols-3 gap-3">
                    {useCaseBuilderSamplePrompts.map((sample, idx) => {
                      return (
                        <CardSample
                          key={idx}
                          title={sample.title}
                          icon={sample.icon}
                          category={sample.category}
                          description={sample.description}
                          promptTemplate={sample.promptTemplate}
                        />
                      );
                    })}
                  </div>
                </div>
              ),
            },
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
                        ユースケース新規作成
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
