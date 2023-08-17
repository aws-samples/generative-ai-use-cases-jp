import { useState } from 'react';
import { PredictContent } from '../@types/predict';
import textToJsonPrompt from '../prompts/text-to-json-prompt';
import usePredictor from './usePredictor';

// JSON 出力に失敗した場合のリトライ上限数
const RETRY_LIMIT = 2;

class FormatError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

const useTextToJson = () => {
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { predict } = usePredictor();

  return {
    isError,
    loading,
    predict: async <T extends Record<string, string>>(
      text: string,
      context: string,
      format: T
    ): Promise<T | null> => {
      const contents: PredictContent[] = [
        {
          role: 'system',
          content: textToJsonPrompt.systemPrompt(context, format),
        },
        {
          role: 'user',
          content: text,
        },
      ];

      setLoading(true);
      setIsError(false);
      let tryPredict = true;
      let tryCount = 0;
      let res: PredictContent | null = null;
      let resJson: T | null = null;

      while (tryPredict) {
        try {
          // 推論実行
          tryCount++;
          res = await predict(contents);

          // 推論結果がJSON形式であるかどうかの確認
          try {
            resJson = JSON.parse(res.content);
          } catch {
            console.log(res.content);
            throw new FormatError(
              textToJsonPrompt.parseErrorRetryPrompt(format)
            );
          }

          // 出力されたJSONが指定のフォーマットであるかどうかの確認
          const formatKeys = Object.keys(format);
          const resKeys = Object.keys(resJson ?? {});

          // キーの数が異なる場合はエラー
          if (formatKeys.length !== resKeys.length) {
            console.log(resJson);
            throw new FormatError(
              textToJsonPrompt.keysInvalidErrorRetryPrompt(format)
            );
          }
          // フォーマットに指定していない項目が含まれていればエラー
          resKeys.forEach((key) => {
            if (!formatKeys.includes(key)) {
              console.log(resJson);
              throw new FormatError(
                textToJsonPrompt.keysInvalidErrorRetryPrompt(format)
              );
            }
          });

          // N/Aを空文字に変換
          const keys: (keyof T)[] = Object.keys(format);
          keys.forEach((key) => {
            if (resJson![key] === 'N/A') {
              resJson![key] = '' as T[keyof T];
            }
          });

          tryPredict = false;
        } catch (e) {
          console.error(e);

          // JSONの出力形式エラーの場合は、エラー情報をセットして再度推論を実行
          if (e instanceof FormatError && res) {
            contents.push(res);
            contents.push({
              role: 'user',
              content: e.message,
            });
          } else {
            // JSONの出力形式エラー以外の場合は、リトライしない
            tryPredict = false;
            setIsError(true);
          }

          // リトライ上限に達したら終了
          if (tryCount >= RETRY_LIMIT) {
            tryPredict = false;
            setIsError(true);
          }
        }
      }

      setLoading(false);
      return resJson;
    },
  };
};

export default useTextToJson;
