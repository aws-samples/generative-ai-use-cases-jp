export type UseCaseInputExample = {
  title: string;
  examples: Record<string, string>;
};

export type TableUseCase = {
  id: string;
  useCaseId: string;
  title: string;
  description?: string;
  promptTemplate: string;
  inputExamples?: UseCaseInputExample[];
  hasShared: boolean;
};
export type TableFavoriteUseCase = {
  id: string;
  useCaseId: string;
};
export type TableRecentlyUseedUseCases = {
  id: string;
  useCaseId: 'recently';
  recentUseIds: string[];
};

export type CustomUseCaseMeta = {
  useCaseId: string;
  title: string;
  description?: string;
  isFavorite: boolean;
  hasShared: boolean;
  isMyUseCase?: boolean;
};

export type CustomUseCase = CustomUseCaseMeta & {
  promptTemplate: string;
  inputExamples?: UseCaseInputExample[];
};

export type UseCaseId = {
  useCaseId: string;
};

export type IsFavorite = {
  isFavorite: boolean;
};

export type HasShared = {
  hasShared: boolean;
};
