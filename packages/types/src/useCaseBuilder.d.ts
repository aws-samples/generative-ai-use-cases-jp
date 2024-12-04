export type UseCaseInputExample = {
  title: string;
  examples: Record<string, string>;
};

// 全てのデータで共通の項目
// Table: PartitionKey=id, SortKey=dataType
// Index: PartitionKey=useCaseId, SortKey=dataType
export type UseCaseCommon = {
  id: string;
  dataType: string;
  useCaseId: string;
};

// ユースケースの内容 (ユースケース作成やアップデート時のリクエスト型)
export type UseCaseContent = {
  title: string;
  description?: string;
  promptTemplate: string;
  inputExamples?: UseCaseInputExample[];
  fixedModelId?: string;
};

// Table に記録されている内容
export type UseCaseInTable = UseCaseCommon &
  UseCaseContent & {
    isShared: boolean;
  };

// Frontend に返される内容
// isFavorite, isMyUseCase は動的に付与
export type UseCaseAsOutput = UseCaseInTable & {
  isFavorite: boolean;
  isMyUseCase: boolean;
};

// お気に入り Toggle のレスポンス用
export type IsFavorite = {
  isFavorite: boolean;
};

// 共有 Toggle のレスポンス用
export type IsShared = {
  isShared: boolean;
};
