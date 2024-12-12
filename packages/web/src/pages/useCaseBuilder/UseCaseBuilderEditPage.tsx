import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { create } from 'zustand';
import RowItem from '../../components/RowItem';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import InputText from '../../components/InputText';
import { PiPlus, PiQuestion, PiTrash, PiEye } from 'react-icons/pi';
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
  NOLABEL,
  extractPlaceholdersFromPromptTemplate,
  getItemsFromPlaceholders,
} from '../../utils/UseCaseBuilderUtils';
import usePageTitle from '../../hooks/usePageTitle';
import Select from '../../components/Select';
import Switch from '../../components/Switch';
import { MODELS } from '../../hooks/useModel';

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
  fixedModelId: string;
  setFixedModelId: (m: string) => void;
  clear: () => void;
};

const useUseCaseBuilderEditPageState = create<StateType>((set, get) => {
  const INIT_STATE = {
    title: '',
    description: '',
    promptTemplate: '',
    inputExamples: [],
    fixedModelId: '',
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
    setFixedModelId: (m: string) => {
      set(() => ({
        fixedModelId: m,
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
    fixedModelId,
    setFixedModelId,
    clear,
  } = useUseCaseBuilderEditPageState();

  const { useCase, isLoading } = useUseCase(useCaseId ?? useCaseIdPathParam);

  const {
    createUseCase,
    updateUseCase,
    deleteUseCase,
    updateRecentUseUseCase,
  } = useMyUseCases();
  const { setPageTitle } = usePageTitle();

  const [isDisabledUpdate, setIsDisabledUpdate] = useState(false);
  const [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isPreview, setIsPreview] = useState(true);

  const { modelIds: availableModels } = MODELS;

  useEffect(() => {
    // 初期表示時にIDを設定する
    setUseCaseId(useCaseIdPathParam ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // DBからデータを取得した場合
    if (useCaseIdPathParam || useCaseId) {
      setTitle(useCase?.title ?? '');
      setPromptTemplate(useCase?.promptTemplate ?? '');
      setDescription(useCase?.description ?? '');
      setInputExamples(useCase?.inputExamples ?? []);
      setFixedModelId(useCase?.fixedModelId ?? '');

      // サンプル集から遷移した場合（RouterのStateから設定）
    } else if (state) {
      setTitle(state.title ?? '');
      setPromptTemplate(state.promptTemplate ?? '');
      setDescription(state.description ?? '');
      setInputExamples(state.inputExamples ?? []);
      setFixedModelId(state.fixedModelId ?? '');
    } else {
      clear();
    }

    // 初期表示時は、更新ボタンをdisabledにする
    setIsDisabledUpdate(true);

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

  const isUpdate = useMemo(() => {
    return !!useCaseId;
  }, [useCaseId]);

  // ページタイトルの設定
  useEffect(() => {
    setPageTitle(isUpdate ? 'ユースケース編集' : 'ユースケース新規作成');
  }, [isUpdate, setPageTitle]);

  const canRegister = useMemo(() => {
    // 以下の場合は登録不可
    // - タイトルとプロンプトテンプレートに何も入力されていない
    // - 全半角スペースしか入力されていない
    // - プレースホルダが1件も入力されていない
    return (
      // eslint-disable-next-line no-irregular-whitespace
      title.replace(/[ 　]/g, '') !== '' &&
      // eslint-disable-next-line no-irregular-whitespace
      promptTemplate.replace(/[ 　]/g, '') !== '' &&
      placeholders.length > 0
    );
  }, [placeholders.length, promptTemplate, title]);

  const onClickRegister = useCallback(() => {
    setIsPosting(true);

    if (isUpdate) {
      updateUseCase({
        useCaseId: useCaseId!,
        title,
        promptTemplate,
        description: description === '' ? undefined : description,
        inputExamples,
        fixedModelId,
      })
        .then(() => {
          // DB変更直後は更新ボタンをDisabledにする
          setIsDisabledUpdate(true);
        })
        .finally(() => {
          setIsPosting(false);
        });
    } else {
      createUseCase({
        title,
        promptTemplate,
        description: description === '' ? undefined : description,
        inputExamples,
        fixedModelId,
      })
        .then(async (res) => {
          setUseCaseId(res.useCaseId);

          // 新規登録したら利用履歴に表示する（Drawerに表示する目的）
          await updateRecentUseUseCase(res.useCaseId);

          // 実行画面に遷移
          navigate(`${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${res.useCaseId}`);
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
    navigate,
    promptTemplate,
    setUseCaseId,
    title,
    updateRecentUseUseCase,
    updateUseCase,
    useCaseId,
    fixedModelId,
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
        <div className="absolute left-0 top-0">
          <LoadingOverlay>
            {isLoading
              ? '読み込み中...'
              : isDeleting
                ? '削除中...'
                : isUpdate
                  ? '更新中...'
                  : '作成中...'}
          </LoadingOverlay>
        </div>
      )}

      <div className="grid h-screen grid-cols-12 gap-4 p-4">
        <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center lg:visible lg:h-min print:visible print:h-min">
          <div className=" text-xl font-semibold">
            {isUpdate ? 'ユースケース編集' : 'ユースケース新規作成'}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Card label="アプリの定義" className="relative">
            <RowItem>
              <InputText
                label="タイトル"
                value={title}
                onChange={(v) => {
                  setTitle(v);
                  setIsDisabledUpdate(false);
                }}
              />
            </RowItem>

            <RowItem>
              <Textarea
                label="概要"
                rows={1}
                value={description}
                onChange={(v) => {
                  setDescription(v);
                  setIsDisabledUpdate(false);
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
                  setIsDisabledUpdate(false);
                }}
                placeholder="プロントテンプレートの書き方については、「ヘルプ」か「サンプル集」をご覧ください。"
                hint="Placeholder (例：{{text:ラベル}}) が未設定の場合は、作成できません。"
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
                              setIsDisabledUpdate(false);
                            }}
                          />

                          {items.map((item, itemIndex) => {
                            return (
                              <Textarea
                                key={itemIndex}
                                label={
                                  item.label !== NOLABEL
                                    ? item.label
                                    : undefined
                                }
                                rows={item.inputType === 'text' ? 2 : 1}
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
                                  setIsDisabledUpdate(false);
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
              <ExpandableField label="モデルの選択">
                <div className="rounded border px-4 py-2">
                  <Switch
                    checked={fixedModelId !== ''}
                    className="text-xl"
                    label={
                      fixedModelId !== ''
                        ? 'モデルが固定化されています。'
                        : 'モデルは固定化されていません。'
                    }
                    onSwitch={() => {
                      if (fixedModelId !== '') {
                        setFixedModelId('');
                      } else {
                        setFixedModelId(availableModels[0]);
                      }
                      setIsDisabledUpdate(false);
                    }}
                  />

                  {fixedModelId !== '' && (
                    <Select
                      value={fixedModelId}
                      onChange={(m) => {
                        setFixedModelId(m);
                        setIsDisabledUpdate(false);
                      }}
                      options={availableModels.map((m) => {
                        return { value: m, label: m };
                      })}
                    />
                  )}

                  <div className="text-xs text-gray-800">
                    {fixedModelId !== '' ? (
                      <>
                        モデル選択の UI が表示されないため、ユーザーは生成 AI
                        の存在を意識せずにユースケースを利用できます
                      </>
                    ) : (
                      <>
                        モデル選択の UI
                        が表示され、ユーザーは自由にモデルを選択できます。
                      </>
                    )}
                  </div>
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
                {!isUpdate && (
                  <Button outlined onClick={onClickClear}>
                    クリア
                  </Button>
                )}

                <Button
                  disabled={!canRegister || (isUpdate && isDisabledUpdate)}
                  onClick={onClickRegister}>
                  {isUpdate ? '更新' : '作成'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <div className="col-span-12 min-h-[calc(100vh-2rem)] lg:col-span-6">
          <Card
            label={`${isPreview ? 'プレビュー' : 'ヘルプ'}`}
            className="relative">
            <div className="absolute right-3 top-3 flex rounded border text-xs font-bold">
              <div
                className={`my-1 ml-1 flex cursor-pointer items-center rounded px-2 py-1 ${isPreview ? 'bg-gray-600 text-white' : 'text-gray-600'}`}
                onClick={() => {
                  setIsPreview(true);
                }}>
                <PiEye className="mr-1 text-base" />
                プレビュー
              </div>
              <div
                className={`my-1 mr-1 flex cursor-pointer items-center rounded px-4 py-1.5 ${isPreview ? 'text-gray-600' : 'bg-gray-600 text-white'}`}
                onClick={() => {
                  setIsPreview(false);
                }}>
                <PiQuestion className="mr-1 text-base" />
                ヘルプ
              </div>
            </div>

            {isPreview ? (
              <AppBuilderView
                title={title}
                promptTemplate={promptTemplate}
                description={description}
                inputExamples={inputExamples}
                fixedModelId={fixedModelId}
                previewMode
              />
            ) : (
              <UseCaseBuilderHelp />
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default UseCaseBuilderEditPage;
