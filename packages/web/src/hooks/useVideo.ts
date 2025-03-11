import { GenerateVideoParams, Model } from 'generative-ai-use-cases-jp';
import useVideoApi from './useVideoApi';
import usePagination from './usePagination';

const useVideo = () => {
  const { generateVideo, listVideoJobs } = useVideoApi();
  const {
    flattenData: videoJobs,
    mutate: mutateVideoJobs,
    isLoading: isLoadingVideoJobs,
    canLoadMore: canLoadMoreVideoJobs,
    loadMore: loadMoreVideoJobs,
    isValidating: isValidatingVideoJobs,
  } = usePagination(listVideoJobs(), 10);

  return {
    generate: async (params: GenerateVideoParams, model: Model | undefined) => {
      return (
        await generateVideo({
          model,
          params,
        })
      ).data;
    },
    videoJobs,
    mutateVideoJobs,
    isLoadingVideoJobs,
    isValidatingVideoJobs,
    canLoadMoreVideoJobs,
    loadMoreVideoJobs,
  };
};

export default useVideo;
