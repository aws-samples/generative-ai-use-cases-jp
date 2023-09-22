/**
 * chat#xxxx 形式の ChatId から xxxx の部分を取り出す
 * @param _chatId chat#xxxx 形式の ChatId
 * @returns chat#xxxx ではない場合は null を返す
 */
export const decomposeChatId = (_chatId: string): string | null => {
  if (!_chatId.includes('#')) {
    return null;
  }
  return _chatId.split('#')[1];
};
