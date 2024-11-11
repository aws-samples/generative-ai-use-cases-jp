import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { create } from 'zustand';
import RowItem from '../../components/RowItem';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import InputText from '../../components/InputText';
import { PiPlus, PiQuestion, PiTrash } from 'react-icons/pi';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useUseCase from '../../hooks/useCaseBuilder/useUseCase';
import LoadingOverlay from '../../components/LoadingOverlay';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';
import ModalDialogDeleteUseCase from '../../components/useCaseBuilder/ModalDialogDeleteUseCase';
import UseCaseBuilderHelp from '../../components/useCaseBuilder/UseCaseBuilderHelp';
import { UseCaseInputExample } from 'generative-ai-use-cases-jp';
import { produce } from 'immer';
import ExpandableField from '../../components/ExpandableField';
import {
  extractPlaceholdersFromPromptTemplate,
  getItemsFromPlaceholders,
} from '../../utils/UseCaseBuilderUtils';

// // 途中でプレースホルダーの項目名（exampleの項目名）が書き換わることがあるため、配列でexamplesを管理
// // DBに登録するタイミングでObjectに変換する
// type TemporayInputExample = {
//   title: string;
//   examples: string[];
// };

type StateType = {
  useCaseId: string | null;
  setUseCaseId: (s: string | null) => void;
  title: string;
  setTitle: (s: string) => void;
  description: string;
  setDescription: (s: string) => void;
  promptTemplate: string;
  setPromptTemplate: (s: string) => void;
  inputExamples: UseCaseInputExample[];
  pushInputExample: (inputExample: UseCaseInputExample) => void;
  removeInputExample: (index: number) => void;
  setInputExample: (index: number, inputExample: UseCaseInputExample) => void;
  setInputExamples: (inputExamples: UseCaseInputExample[]) => void;
  clear: () => void;
};

const useUseCaseBuilderEditPageState = create<StateType>((set, get) => {
  const INIT_STATE = {
    title: '',
    description: '',
    promptTemplate: '',
    inputExamples: [],
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
    setDescription: (s) => {
      set(() => ({
        description: s,
      }));
    },
    setPromptTemplate: (s) => {
      set(() => ({
        promptTemplate: s,
      }));
    },
    pushInputExample: (inputExample) => {
      set(() => ({
        inputExamples: produce(get().inputExamples, (draft) => {
          draft.push(inputExample);
        }),
      }));
    },
    removeInputExample: (index) => {
      set(() => ({
        inputExamples: produce(get().inputExamples, (draft) => {
          draft.splice(index, 1);
        }),
      }));
    },
    setInputExample: (index, inputExample) => {
      set(() => ({
        inputExamples: produce(get().inputExamples, (draft) => {
          draft[index] = inputExample;
        }),
      }));
    },
    setInputExamples: (inputExamples) => {
      set(() => ({
        inputExamples: inputExamples,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

// const flattenInputExamples = (
//   itemLables: string[],
//   tmp: UseCaseInputExample[]
// ): TemporayInputExample[] => {
//   return tmp.map((t) => {
//     return {
//       title: t.title,
//       examples: itemLables.map((label) => t.examples[label]),
//     };
//   });
// };

// // "入力例"の変数をDB格納用の形式に変換する
// const convertInputExamples = (
//   itemLables: string[],
//   tmp: TemporayInputExample[]
// ): UseCaseInputExample[] => {
//   return tmp.map((t) => {
//     const examples: Record<string, string> = {};
//     itemLables.forEach((label, idx) => {
//       examples[label] = t.examples[idx];
//     });

//     return {
//       title: t.title,
//       examples,
//     };
//   });
// };

const UseCaseBuilderEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { useCaseId: useCaseIdPathParam } = useParams();
  const { state } = useLocation();

  const {
    title,
    setTitle,
    promptTemplate,
    setPromptTemplate,
    description,
    setDescription,
    useCaseId,
    setUseCaseId,
    inputExamples,
    pushInputExample,
    setInputExample,
    setInputExamples,
    removeInputExample,
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
    if (useCaseIdPathParam) {
      setTitle(useCase?.title ?? '');
      setPromptTemplate(useCase?.promptTemplate ?? '');
      setDescription(useCase?.description ?? '');
      setInputExamples(useCase?.inputExamples ?? []);
    } else if (state) {
      console.log(state.inputExamples);
      setTitle(state.title ?? '');
      setPromptTemplate(state.promptTemplate ?? '');
      setDescription(state.description ?? '');
      setInputExamples(state.inputExamples ?? []);
    } else {
      clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCase]);

  // プロンプトテンプレート中にあるプレースホルダ
  const placeholders = useMemo(() => {
    return extractPlaceholdersFromPromptTemplate(promptTemplate);
  }, [promptTemplate]);

  // プレースホルダをObjectに変換
  const items = useMemo(() => {
    return getItemsFromPlaceholders(placeholders);
  }, [placeholders]);

  // // 登録用のフォーマットに変換
  // const convertedInputExamples = useMemo(() => {
  //   return convertInputExamples(
  //     items.map((item) => item.label),
  //     inputExamples
  //   );
  // }, [inputExamples, items]);

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
        description: description === '' ? undefined : description,
        inputExamples,
      }).finally(() => {
        setIsPosting(false);
      });
    } else {
      createUseCase({
        title,
        promptTemplate,
        description: description === '' ? undefined : description,
        inputExamples,
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
    description,
    inputExamples,
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
        <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center lg:visible lg:h-min print:visible print:h-min">
          <div className=" text-xl font-semibold">
            {isUpdate ? 'ユースケース編集' : 'ユースケース新規作成'}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Card label="アプリの定義" className="relative">
            <Button
              outlined
              className="absolute right-5 top-5 text-sm"
              onClick={() => {
                setIsOpen(!isOpen);
              }}>
              <PiQuestion className="mr-1" />
              ヘルプ
            </Button>
            <RowItem>
              <InputText label="タイトル" value={title} onChange={setTitle} />
            </RowItem>

            <RowItem>
              <Textarea
                label="概要"
                rows={1}
                value={description}
                onChange={(v) => {
                  setDescription(v);
                }}
              />
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
            <RowItem>
              <ExpandableField label="入力例">
                <div className="flex flex-col gap-2">
                  {inputExamples.map((inputExample, idx) => {
                    return (
                      <div key={idx} className="rounded border px-4 pt-2">
                        <div className="flex flex-col">
                          <InputText
                            className="mb-2"
                            label="タイトル"
                            value={inputExample.title}
                            onChange={(v) => {
                              setInputExample(idx, {
                                ...inputExample,
                                title: v,
                              });
                            }}
                          />

                          {items.map((item, itemIndex) => {
                            return (
                              <Textarea
                                key={itemIndex}
                                label={item.label}
                                rows={2}
                                value={
                                  inputExample.examples
                                    ? inputExample.examples[item.label]
                                    : ''
                                }
                                onChange={(v) => {
                                  setInputExample(idx, {
                                    title: inputExample.title,
                                    examples: produce(
                                      inputExample.examples,
                                      (draft) => {
                                        draft[item.label] = v;
                                      }
                                    ),
                                  });
                                }}
                              />
                            );
                          })}

                          <div className="mb-2 flex justify-end">
                            <Button
                              className="bg-red-600"
                              onClick={() => {
                                removeInputExample(idx);
                              }}>
                              <PiTrash className="mr-2" />
                              削除
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    outlined
                    onClick={() => {
                      const examples: Record<string, string> = {};
                      items.forEach((item) => {
                        examples[item.label] = '';
                      });
                      pushInputExample({
                        title: '',
                        examples,
                      });
                    }}>
                    <PiPlus className="pr-2 text-xl" />
                    入力例を追加
                  </Button>
                </div>
              </ExpandableField>
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
        <div className="col-span-12 min-h-[calc(100vh-2rem)] lg:col-span-6">
          <Card label="プレビュー">
            <AppBuilderView
              title={title}
              promptTemplate={promptTemplate}
              description={description}
              inputExamples={inputExamples}
              previewMode
            />
          </Card>
        </div>
      </div>
    </>
  );
};

export default UseCaseBuilderEditPage;
