/**
 * systemContext#xxxx 形式の systemContextId から xxxx の部分を取り出す
 * @param _systemContextId systemContext#xxxx 形式の systemContextId
 * @returns systemContext#xxxx ではない場合は null を返す
 */
export const decomposeSystemContextId = (
  _systemContextId: string
): string | null => {
  if (!_systemContextId.includes('#')) {
    return null;
  }
  return _systemContextId.split('#')[1];
};
