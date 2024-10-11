export type CustomUseCaseMeta = {
  useCaseId: string;
  title: string;
  isFavotite: boolean;
  hasShared: boolean;
  isMyUseCase?: boolean;
};

export type CustomUseCase = CustomUseCaseMeta & {
  promptTemplate: string;
};
