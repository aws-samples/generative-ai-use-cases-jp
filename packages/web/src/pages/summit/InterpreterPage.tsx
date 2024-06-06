import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Card from '../../components/Card';
import Select from '../../components/Select';
import { create } from 'zustand';
import InputText from '../../components/summit/InputText';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import { useLocation, useParams } from 'react-router-dom';
import useChat from '../../hooks/useChat';
import interpreterPrompt from '../../prompts/interpreter-prompt';
import useInterpreter from '../../hooks/summit/useInterpreter';
import {
  PiArrowLeft,
  PiArrowRight,
  PiCheckCircleBold,
  PiCheckCircleThin,
  PiLightningBold,
  PiPowerBold,
  PiRocketLaunchBold,
  PiSlidersBold,
  PiSpinnerGap,
  PiSpinnerGapThin,
  PiXCircleBold,
} from 'react-icons/pi';
import ModalDialog from '../../components/ModalDialog';
import ExpandableField from '../../components/ExpandableField';
import { produce } from 'immer';
import { TestCaseType, TestResultType } from '../../@types/summit/interpreter';
import { isEqual } from 'lodash';
import { MODELS } from '../../hooks/useModel';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import InputChatContent from '../../components/InputChatContent';
import ButtonIcon from '../../components/ButtonIcon';

const WELCOME_CODE = `                                 █████╗ ██╗    ██╗███████╗   
                                ██╔══██╗██║    ██║██╔════╝   
                                ███████║██║ █╗ ██║███████╗   
                                ██╔══██║██║███╗██║╚════██║   
                                ██║  ██║╚███╔███╔╝███████║   
                                ╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝   
                            
██╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ███████╗████████╗███████╗██████╗ 
██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗
██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝█████╗     ██║   █████╗  ██████╔╝
██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██╔══╝     ██║   ██╔══╝  ██╔══██╗
██║██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║███████╗   ██║   ███████╗██║  ██║
╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
`;

type StateType = {
  functionName: string;
  setFunctionName: (s: string) => void;
  roleArn: string;
  setRoleArn: (s: string) => void;
  runtime: string;
  setRuntime: (s: string) => void;
  content: string;
  setContent: (s: string) => void;
  shouldUpdate: boolean;
  setShouldUpdate: (b: boolean) => void;
  testData: string;
  setTestData: (s: string) => void;
  testCases: TestCaseType[];
  setTestCases: (c: TestCaseType[]) => void;
  testResults: TestResultType[];
  setTestResults: (r: TestResultType[]) => void;
};

const useInterpreterPageState = create<StateType>((set) => {
  return {
    functionName: '',
    setFunctionName: (s: string) => {
      set(() => ({
        functionName: s,
      }));
    },
    roleArn: import.meta.env.VITE_APP_CREATE_FUNCTION_ROLE_ARN,
    setRoleArn: (s: string) => {
      set(() => ({
        roleArn: s,
      }));
    },
    runtime: 'nodejs20.x',
    setRuntime: (s: string) => {
      set(() => ({
        runtime: s,
      }));
    },
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    shouldUpdate: false,
    setShouldUpdate: (b: boolean) => {
      set(() => ({
        shouldUpdate: b,
      }));
    },
    testData: '',
    setTestData: (s: string) => {
      set(() => ({
        testData: s,
      }));
    },
    testCases: [],
    setTestCases: (c: TestCaseType[]) => {
      set(() => ({
        testCases: c,
      }));
    },
    testResults: [],
    setTestResults: (r) => {
      set(() => ({
        testResults: r,
      }));
    },
  };
});

const runtimeOptions = [
  {
    value: 'nodejs20.x',
    label: 'nodejs20.x',
  },
  {
    value: 'python3.12',
    label: 'python3.12',
  },
];

const roleOptions = [
  {
    value: import.meta.env.VITE_APP_CREATE_FUNCTION_ROLE_ARN,
    label: 'デフォルトロール',
  },
];

const InterpreterPage: React.FC = () => {
  const {
    functionName,
    setFunctionName,
    roleArn,
    setRoleArn,
    runtime,
    setRuntime,
    content,
    setContent,
    shouldUpdate,
    setShouldUpdate,
    testData,
    setTestData,
    testCases,
    setTestCases,
    testResults,
    setTestResults,
  } = useInterpreterPageState();

  const { pathname } = useLocation();
  const { chatId } = useParams();

  const {
    getModelId,
    setModelId,
    postChat,
    messages,
    isEmpty,
    updateSystemContext,
    loading,
    // loadingMessages,
    clear,
    // getCurrentSystemContext,
  } = useChat(pathname);
  const {
    createFunction,
    updateFunction,
    existsFunction,
    invokeFunction,
    generateTestData,
  } = useInterpreter();

  const { modelIds: availableModels } = MODELS;
  const modelId = getModelId();

  const [isOpenTest, setIsOpenTest] = useState(false);
  const [loadingDeploy, setLoadingDeploy] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingGenerateTestData, setLoadingGenerateTestData] = useState(false);
  const [loadingFunctionName, setLoadingFunctionName] = useState(false);
  const [disabledDeploy, setDisabledDeploy] = useState(true);
  const [notDeployed, setNotDeployed] = useState(true);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const [callFunctionInput, setCallFunctionInput] = useState('');
  const [callFunctionOutput, setCallFunctionOutput] = useState('');
  const [disabledCallFunction, setDisabledCallFunction] = useState(true);
  const [callingFunction, setCallingFunction] = useState(false);
  const [callFunctionStatus, setCallFunctionStatus] = useState('');

  const codeLanguage = useMemo(() => {
    if (runtime.startsWith('nodejs')) {
      return 'js';
    } else if (runtime.startsWith('python')) {
      return 'python';
    } else if (runtime.startsWith('java')) {
      return 'java';
    } else {
      return 'ruby';
    }
  }, [runtime]);

  // const currentSystemContext = useMemo(
  //   () => getCurrentSystemContext(),
  //   [getCurrentSystemContext]
  // );

  // useEffect(() => {
  //   setInputSystemContext(currentSystemContext);
  // }, [currentSystemContext, setInputSystemContext]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;
    setModelId(_modelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels]);

  const codes = messages
    .filter((msg) => msg.role === 'assistant')
    .map((msg) => msg.content);
  const [code, setCode] = useState(WELCOME_CODE);
  const [codeIndex, setCodeIndex] = useState(0);

  useEffect(() => {
    if (codes[codeIndex]) {
      setCode(codes[codeIndex]);
    } else if (loading) {
      setCode('');
    } else {
      setCode(WELCOME_CODE);
    }
  }, [codeIndex, codes, loading]);

  useEffect(() => {
    updateSystemContext(interpreterPrompt.systemContext(runtime));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime]);

  const checkDeployable = useCallback(() => {
    setDisabledDeploy(true);
    setDisabledCallFunction(true);
    if (functionName === '') {
      return;
    }
    setLoadingFunctionName(true);
    existsFunction(functionName)
      .then((exists) => {
        setShouldUpdate(exists);
        setDisabledDeploy(false);
        setDisabledCallFunction(false);
      })
      .finally(() => {
        setLoadingFunctionName(false);
      });
  }, [existsFunction, functionName, setShouldUpdate]);

  const onSend = useCallback(() => {
    setCodeIndex(codes.length);
    setDisabledDeploy(true);
    setNotDeployed(true);
    postChat(
      interpreterPrompt.generationContext(content),
      false,
      undefined,
      undefined,
      undefined,
      undefined
    ).then(() => {
      checkDeployable();
    });
    setContent('');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    setCodeIndex(0);
  }, [clear, setContent]);

  const onClickDeploy = useCallback(() => {
    setLoadingDeploy(true);
    setDisabledCallFunction(true);
    if (shouldUpdate) {
      updateFunction({
        functionName: functionName,
        code: code,
        role: roleArn,
        runtime: runtime,
      })
        .then(() => {
          setDisabledCallFunction(false);
          setNotDeployed(false);
        })
        .finally(() => {
          setLoadingDeploy(false);
        });
    } else {
      createFunction({
        functionName: functionName,
        code: code,
        role: roleArn,
        runtime: runtime,
      })
        .then(() => {
          setDisabledCallFunction(false);
          setNotDeployed(false);
        })
        .finally(() => {
          setLoadingDeploy(false);
        });
    }
  }, [
    code,
    createFunction,
    functionName,
    roleArn,
    runtime,
    shouldUpdate,
    updateFunction,
  ]);

  const callFunction = useCallback(() => {
    setCallingFunction(true);
    setCallFunctionStatus('');
    invokeFunction({
      functionName,
      payload: callFunctionInput,
    })
      .then((res) => {
        setCallFunctionOutput(JSON.stringify(res.data));
        console.log(res.data);
        if (res.data instanceof Object) {
          if ('errorMessage' in res.data && 'errorType' in res.data) {
            setCallFunctionStatus('error');
          } else {
            setCallFunctionStatus('success');
          }
        } else {
          setCallFunctionStatus('success');
        }
      })
      .catch((e) => {
        setCallFunctionOutput(e);
        setCallFunctionStatus('error');
      })
      .finally(() => {
        setCallingFunction(false);
      });
  }, [callFunctionInput, functionName, invokeFunction]);

  useEffect(() => {
    setErrorMessage(null);
    setTestCases([]);
    if (testData === '') {
      return;
    }
    try {
      const data = JSON.parse(testData);
      if (!Array.isArray(data)) {
        setErrorMessage('配列形式になっていません。');
        return;
      }

      data.forEach((d) => {
        if (!('input' in d)) {
          setErrorMessage('各テストデータには input キーが必要です。');
          return;
        }
        if (!('output' in d)) {
          setErrorMessage('各テストデータには output キーが必要です。');
          return;
        }
      });
      setTestCases([...data]);
    } catch (e) {
      console.log(e);
      setErrorMessage('JSON形式ではありません。');
      return;
    }
  }, [setTestCases, testData]);

  const onClickGenerateTestData = useCallback(() => {
    setLoadingGenerateTestData(true);
    setTestData('');

    generateTestData(messages)
      .then((testData) => {
        setTestData(testData);
      })
      .finally(() => {
        setLoadingGenerateTestData(false);
      });
  }, [generateTestData, messages, setTestData]);

  const onClickTest = useCallback(() => {
    setLoadingTest(true);
    setTestResults(
      new Array(testCases.length).fill({
        status: 'testing',
        result: '',
      })
    );
    Promise.all(
      testCases.map((c, idx) => {
        invokeFunction({
          functionName,
          payload: c.input,
        })
          .then((res) => {
            setTestResults(
              produce(
                useInterpreterPageState.getState().testResults,
                (draft) => {
                  draft[idx] = {
                    status: isEqual(res.data, c.output) ? 'pass' : 'fail',
                    result: res.data,
                  };
                }
              )
            );
          })
          .catch((e) => {
            setTestResults(
              produce(
                useInterpreterPageState.getState().testResults,
                (draft) => {
                  draft[idx] = {
                    status: 'fail',
                    result: e,
                  };
                }
              )
            );
          });
      })
    ).finally(() => {
      setLoadingTest(false);
    });
  }, [functionName, invokeFunction, setTestResults, testCases]);

  const onClickFixCodeByTests = useCallback(() => {
    setContent(
      interpreterPrompt.fixFaildedTest(
        testResults
          .filter((result) => result.status === 'fail')
          .map((result, idx) => ({
            ...testCases[idx],
            result: result.result,
          }))
      )
    );
    setIsOpenTest(false);
  }, [setContent, testCases, testResults]);

  const onClickFixCodeByError = useCallback(() => {
    setContent(interpreterPrompt.fixError(callFunctionOutput));
  }, [callFunctionOutput, setContent]);

  const functionNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = () => {
      checkDeployable();
    };
    const ref = functionNameRef.current;
    ref?.addEventListener('focusout', listener);
    return () => {
      ref?.removeEventListener('focusout', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functionName]);

  useEffect(() => {
    setDisabledDeploy(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functionName]);

  return (
    <>
      <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          AWS Interpreter
        </div>
        <div className="mt-2 flex w-full items-end justify-center gap-4 lg:mt-0">
          <Select
            label="利用モデル"
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => {
              return { value: m, label: m };
            })}
          />
          <Select
            label="Lambda ランタイム"
            options={runtimeOptions}
            value={runtime}
            onChange={setRuntime}
          />
        </div>
        <div className="relative mx-5">
          <SyntaxHighlighter
            language={codeLanguage}
            style={vscDarkPlus}
            className={`h-[calc(100vh-20rem)] whitespace-pre-wrap rounded-lg ${isEmpty && 'flex items-center justify-center'}`}>
            {code}
          </SyntaxHighlighter>

          {!isEmpty && (
            <div className="absolute right-0 top-0 m-2 mr-5 flex text-white">
              <ButtonIcon
                disabled={codeIndex === 0}
                onClick={() => {
                  setCodeIndex(codeIndex - 1);
                }}>
                <PiArrowLeft />
              </ButtonIcon>

              <ButtonIcon
                disabled={codeIndex >= codes.length - 1}
                onClick={() => {
                  setCodeIndex(codeIndex + 1);
                }}>
                <PiArrowRight />
              </ButtonIcon>
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="mx-5 flex justify-center">
            <Card className="w-full">
              <div className="flex items-center justify-between">
                <div className="font-semibold">デプロイ／テストの実行</div>
              </div>
              <div className="my-3 border-b"></div>
              <div className={`-mr-4 overflow-y-auto `}>
                <div className="mx-3 flex flex-col">
                  <div>
                    <div className="flex items-center font-semibold">
                      <PiSlidersBold className="mr-1" />
                      Lambda 関数の基本情報
                    </div>
                  </div>
                  <div className="relative">
                    <InputText
                      ref={functionNameRef}
                      label="関数名"
                      value={functionName}
                      onChange={setFunctionName}
                    />
                    <div className="absolute right-2 top-7 text-3xl">
                      {disabledDeploy && !loadingFunctionName && (
                        <PiCheckCircleThin />
                      )}
                      {!disabledDeploy && (
                        <PiCheckCircleBold className="text-green-600" />
                      )}
                      {loadingFunctionName && (
                        <PiSpinnerGapThin className="animate-spin" />
                      )}
                    </div>
                  </div>
                  <Select
                    label="ロール"
                    value={roleArn}
                    onChange={setRoleArn}
                    options={roleOptions}
                  />
                </div>
                <div className="my-3 border-b"></div>
                <div className="mx-3 flex items-end justify-between">
                  <div>
                    <div className="flex items-center font-semibold">
                      <PiRocketLaunchBold className="mr-1" />
                      デプロイ
                    </div>
                    <div className="text-sm text-gray-600">
                      LLM が生成した最新のコードを Lambda
                      関数としてデプロイします。
                    </div>
                    {functionName !== '' && shouldUpdate && (
                      <div className="text-sm font-semibold text-red-500">
                        既に Lambda 関数[{functionName}
                        ]が存在します。デプロイすると上書きされます。
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {notDeployed && (
                      <div className="bg-aws-squid-ink rounded-full px-2 py-1 text-xs text-white">
                        NOT Deployed
                      </div>
                    )}
                    <Button
                      disabled={disabledDeploy}
                      loading={loadingDeploy}
                      onClick={onClickDeploy}>
                      デプロイ
                    </Button>
                  </div>
                </div>
                <div className="my-3 border-b"></div>
                <div className="mx-3 flex items-start justify-between">
                  <div className="mr-3 w-full">
                    <div className="flex items-center font-semibold">
                      <PiPowerBold className="mr-1" />
                      実行
                    </div>
                    <div className="text-sm text-gray-600">
                      デプロイした Lambda 関数を実行します。
                    </div>

                    <div className="mt-3 text-sm font-semibold">
                      関数の INPUT
                    </div>
                    <Textarea
                      className="w-32"
                      value={callFunctionInput}
                      rows={3}
                      onChange={setCallFunctionInput}
                    />

                    <div className="mt-3 text-sm font-semibold">実行結果</div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      ステータス:
                      {callFunctionStatus === 'error' && (
                        <div className="flex items-center gap-1">
                          <PiXCircleBold className="text-red-600" />
                          <div className="text-red-600">エラー</div>
                        </div>
                      )}
                      {callFunctionStatus === 'success' && (
                        <div className="flex items-center gap-1">
                          <PiCheckCircleBold className="text-green-600" />
                          <div className="text-green-600">正常終了</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-sm">関数の OUTPUT</div>
                    <div className="min-h-8 rounded border p-1">
                      {callFunctionOutput}
                    </div>
                  </div>
                  <div className="flex w-32 flex-col items-end">
                    <Button
                      className="whitespace-nowrap"
                      disabled={disabledCallFunction}
                      loading={callingFunction}
                      onClick={callFunction}>
                      実行
                    </Button>

                    {callFunctionStatus === 'error' && (
                      <Button
                        className="whitespace-nowrap"
                        onClick={onClickFixCodeByError}>
                        エラーの修正を指示する
                      </Button>
                    )}
                  </div>
                </div>
                <div className="my-3 border-b"></div>
                <div className="mx-3 flex items-start justify-between">
                  <div className="mr-3 w-full">
                    <div className="flex items-center font-semibold">
                      <PiLightningBold className="mr-1" />
                      テスト
                    </div>
                    <div className="text-sm text-gray-600">
                      Lambda 関数のテストを行います。
                    </div>

                    {errorMessage && (
                      <div className="mt-1 text-sm font-semibold text-red-500">
                        <div>テストデータ形式に誤りがあります。</div>
                        <div>
                          詳細：
                          {errorMessage}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 text-sm font-semibold">
                      テストデータ
                    </div>
                    <Textarea
                      className="w-64"
                      value={testData}
                      placeholder={`以下のJSON形式で入力してください。
{
  "describe": "テストデータの説明（任意）",
  "input": "Lambda関数のINPUT",
  "output": "Lambda関数のOUTPUT"
}[] `}
                      rows={6}
                      onChange={setTestData}
                    />
                  </div>
                  <div className="flex w-32 flex-col items-end">
                    <Button
                      disabled={loadingTest}
                      className="whitespace-nowrap"
                      loading={loadingGenerateTestData}
                      onClick={onClickGenerateTestData}>
                      データ生成
                    </Button>
                    <Button
                      className="mt-3 whitespace-nowrap"
                      disabled={disabledDeploy || loadingGenerateTestData}
                      loading={loadingTest}
                      onClick={() => {
                        setIsOpenTest(true);
                      }}>
                      テスト実行
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      <ModalDialog isOpen={isOpenTest} title="テスト実行">
        <>
          {testCases.length === 0 && (
            <div className="mb-3 flex items-center font-bold">
              テストケースがありません。
            </div>
          )}
          {testResults.length > 0 &&
            testResults.filter((r) => r.status === 'pass').length ===
              testResults.length && (
              <div className="flex items-center font-bold text-green-600">
                <PiCheckCircleBold className="mr-1" />
                テストが全て PASS しました。
              </div>
            )}
          {testResults.filter((r) => r.status === 'fail').length > 0 && (
            <div className="flex items-center font-bold text-red-600">
              <PiXCircleBold className="mr-1" />
              FAIL したテストケースがあります。
            </div>
          )}
          {testCases.map((c, idx) => {
            return (
              <div key={idx}>
                <div className="flex items-center">
                  <div className="mr-1">
                    {testResults[idx]?.status === 'testing' && (
                      <PiSpinnerGap className="animate-spin" />
                    )}
                    {testResults[idx]?.status === 'pass' && (
                      <PiCheckCircleBold className="text-green-600" />
                    )}
                    {testResults[idx]?.status === 'fail' && (
                      <PiXCircleBold className="text-red-600" />
                    )}
                  </div>
                  <div className="mr-1">ケース {idx + 1}:</div>
                  <div>{c.describe}</div>
                </div>
                <ExpandableField label="テスト詳細" className="ml-3">
                  <div className="ml-6">
                    <div>入力データ: {JSON.stringify(c.input)}</div>
                    <div>期待値: {JSON.stringify(c.output)}</div>
                    <div>
                      実行結果: {JSON.stringify(testResults[idx]?.result)}
                    </div>
                  </div>
                </ExpandableField>
              </div>
            );
          })}
          <div className="flex justify-between">
            <div className="flex gap-3">
              <Button
                disabled={testCases.length === 0}
                loading={loadingTest}
                onClick={() => {
                  onClickTest();
                }}>
                テストの実行
              </Button>
              {testResults.filter((r) => r.status === 'fail').length > 0 && (
                <Button
                  loading={loadingTest}
                  onClick={() => {
                    onClickFixCodeByTests();
                  }}>
                  コード修正を指示する
                </Button>
              )}
            </div>

            <Button
              outlined
              loading={loadingTest}
              onClick={() => {
                setIsOpenTest(false);
              }}>
              閉じる
            </Button>
          </div>
        </>
      </ModalDialog>

      <div className="fixed bottom-0 z-0 flex w-full flex-col items-center justify-center lg:pr-64 print:hidden">
        {/* {isEmpty && !loadingMessages && !chatId && (
          <ExpandableField
            label="システムコンテキスト"
            className="relative w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6">
            <>
              <div className="absolute -top-2 right-0 mb-2 flex justify-end">
                <Button
                  outlined
                  className="text-xs"
                  onClick={() => {
                    clear();
                    setInputSystemContext(currentSystemContext);
                  }}>
                  初期化
                </Button>
              </div>

              <InputChatContent
                disableMarginBottom={true}
                content={inputSystemContext}
                onChangeContent={setInputSystemContext}
                fullWidth={true}
                resetDisabled={true}
                disabled={inputSystemContext === currentSystemContext}
                sendIcon={<PiArrowClockwiseBold />}
                onSend={() => {
                  updateSystemContext(inputSystemContext);
                }}
                hideReset={true}
              />
            </>
          </ExpandableField>
        )} */}

        <InputChatContent
          content={content}
          disabled={loading}
          onChangeContent={setContent}
          resetDisabled={!!chatId}
          onSend={() => {
            onSend();
          }}
          onReset={onReset}
        />
        <div className="mb-4 flex gap-2">
          {!messages.length &&
            examplePrompts.map(({ value, label }) => (
              <RoundedButton onClick={() => setContent(value)} key={label}>
                {label} ↗️
              </RoundedButton>
            ))}
        </div>
      </div>
    </>
  );
};

const examplePrompts = [
  {
    label: 'FizzBuzz',
    value: `<処理の概要>
FizzBuzzを行う。
</処理の概要>

<関数のINPUT>
計算対象の数値をプリミティブで入力
</関数のINPUT>

<関数のOUTPUT>
結果を文字列で返す
</関数のOUTPUT>`,
  },
  {
    label: '年齢計算',
    value: `<処理の概要>
生年月日がYYYY/MM/DD形式で与えられるので、今日時点の年齢を計算する。
生年月日の形式が間違っていたり、未来の日付の場合はエラーとしてください。
</処理の概要>

<関数のINPUT>
生年月日をプリミティブで入力
</関数のINPUT>

<関数のOUTPUT>
今日時点の年齢を数値で返す
</関数のOUTPUT>`,
  },
  {
    label: '素数判定',
    value: `<処理の概要>
素数かどうかを判定する関数。
数値以外が入力された場合は、エラーとしてください。
</処理の概要>

<関数のINPUT>
数値をプリミティブで入力
</関数のINPUT>

<関数のOUTPUT>
素数の場合は"true", 素数ではない場合は"false"を出力
</関数のOUTPUT>`,
  },
  {
    label: 'テンプレート',
    value: `<処理の概要>
</処理の概要>

<関数のINPUT>
</関数のINPUT>

<関数のOUTPUT>
</関数のOUTPUT>`,
  },
];

const RoundedButton = (
  props: React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) => {
  return (
    <button
      className="cursor-pointer rounded-full border p-2 text-xs hover:border-gray-300 hover:bg-gray-50"
      {...props}
    />
  );
};

export default InterpreterPage;
