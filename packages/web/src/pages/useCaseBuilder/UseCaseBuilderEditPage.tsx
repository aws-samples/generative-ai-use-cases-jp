import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { create } from 'zustand';
import RowItem from '../../components/RowItem';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import InputText from '../../components/InputText';
import { PiQuestion, PiTrash } from 'react-icons/pi';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import { useNavigate, useParams } from 'react-router-dom';
import useUseCase from '../../hooks/useCaseBuilder/useUseCase';
import LoadingOverlay from '../../components/LoadingOverlay';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import ModalDialogDeleteUseCase from '../../components/useCaseBuilder/ModalDialogDeleteUseCase';
import UseCaseBuilderHelp from '../../components/useCaseBuilder/UseCaseBuilderHelp';

type StateType = {
  useCaseId: string | null;
  setUseCaseId: (s: string | null) => void;
  title: string;
  setTitle: (s: string) => void;
  promptTemplate: string;
  setPromptTemplate: (s: string) => void;
  clear: () => void;
};

const useUseCaseBuilderEditPageState = create<StateType>((set) => {
  const INIT_STATE = {
    title: '',
    promptTemplate: '',
  };
  return {
    ...INIT_STATE,
    useCaseId: null,
    setUseCaseId: (s) => {
      set(() => ({
        useCaseId: s,
      }));
    },
    setTitle: (s) => {
      set(() => ({
        title: s,
      }));
    },
    setPromptTemplate: (s) => {
      set(() => ({
        promptTemplate: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const UseCaseBuilderEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { useCaseId: useCaseIdPathParam } = useParams();
  const {
    title,
    setTitle,
    promptTemplate,
    setPromptTemplate,
    useCaseId,
    setUseCaseId,
    clear,
  } = useUseCaseBuilderEditPageState();

  const { useCase, isLoading } = useUseCase(useCaseId ?? useCaseIdPathParam);
  const { createUseCase, updateUseCase, deleteUseCase } = useMyUseCases();

  const [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPosting, setIsPosting] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 初期表示時にIDを設定する
    setUseCaseId(useCaseIdPathParam ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTitle(useCase?.title ?? '');
    setPromptTemplate(useCase?.promptTemplate ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCase]);

  const isUpdate = useMemo(() => {
    return !!useCaseId;
  }, [useCaseId]);

  const canRegister = useMemo(() => {
    return title !== '' && promptTemplate !== '';
  }, [promptTemplate, title]);

  const onClickRegister = useCallback(() => {
    setIsPosting(true);

    if (isUpdate) {
      updateUseCase({
        useCaseId: useCaseId!,
        title,
        promptTemplate,
      }).finally(() => {
        setIsPosting(false);
      });
    } else {
      createUseCase({
        title,
        promptTemplate,
      })
        .then((res) => {
          setUseCaseId(res.useCaseId);
        })
        .finally(() => {
          setIsPosting(false);
        });
    }
  }, [
    createUseCase,
    isUpdate,
    promptTemplate,
    setUseCaseId,
    title,
    updateUseCase,
    useCaseId,
  ]);

  const onClickDelete = useCallback(() => {
    if (!useCaseId) {
      return;
    }
    setIsDeleting(true);
    deleteUseCase(useCaseId)
      .then(() => {
        navigate(ROUTE_INDEX_USE_CASE_BUILDER);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  }, [deleteUseCase, navigate, useCaseId]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ModalDialogDeleteUseCase
        isOpen={isOpenDeleteDialog}
        targetLabel={title}
        onDelete={onClickDelete}
        onClose={() => {
          setIsOpenDeleteDialog(false);
        }}
      />
      {(isLoading || isDeleting || isPosting) && (
        <LoadingOverlay>
          {isLoading ? '読み込み中...' : isDeleting ? '削除中...' : '登録中...'}
        </LoadingOverlay>
      )}

      <UseCaseBuilderHelp
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />

      <div className="grid h-screen grid-cols-12 gap-4 p-4">
        <div className="invisible relative col-span-12 my-0 flex h-0 items-center justify-center lg:visible lg:h-min print:visible print:h-min">
          <div className=" text-xl font-semibold">
            {isUpdate ? 'ユースケース編集' : 'ユースケース新規作成'}
          </div>

          <Button
            outlined
            className="absolute right-0 text-sm"
            onClick={() => {
              setIsOpen(true);
            }}>
            <PiQuestion className="mr-1" />
            ヘルプ
          </Button>
        </div>
        <div className="col-span-12 h-[calc(100vh-2rem)] lg:col-span-6">
          <Card label="アプリの定義">
            <RowItem>
              <InputText label="タイトル" value={title} onChange={setTitle} />
            </RowItem>
            <RowItem>
              <Textarea
                label="プロンプトテンプレート"
                rows={30}
                maxHeight={500}
                value={promptTemplate}
                onChange={(v) => {
                  setPromptTemplate(v);
                }}
              />
            </RowItem>
            <div className="flex justify-between">
              {isUpdate ? (
                <Button
                  className="bg-red-600"
                  onClick={() => {
                    setIsOpenDeleteDialog(true);
                  }}>
                  <PiTrash className="mr-2" />
                  削除
                </Button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-3">
                <Button outlined onClick={onClickClear}>
                  クリア
                </Button>

                <Button disabled={!canRegister} onClick={onClickRegister}>
                  {isUpdate ? '更新' : '登録'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <div className="col-span-12 h-[calc(100vh-2rem)] lg:col-span-6">
          <Card label="プレビュー">
            <AppBuilderView
              title={title}
              promptTemplate={promptTemplate}
              previewMode
            />
          </Card>
        </div>
      </div>
    </>
  );
};

export default UseCaseBuilderEditPage;
