/**
 * usecase#xxxx 形式の それぞれの usecaseId (usecase: chat, systemContext) から xxxx の部分を取り出す
 * @param _usecaseId usecase#xxxx 形式の usecaseId
 * @returns usecase#xxxx ではない場合は null を返す
 */
export const decomposeId = (_usecaseId: string): string | null => {
  if (!_usecaseId.includes('#')) {
    return null;
  }
  return _usecaseId.split('#')[1];
};
