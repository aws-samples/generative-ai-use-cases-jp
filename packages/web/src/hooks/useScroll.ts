const useScroll = () => {
  return {
    scrollToTop: () => {
      document.getElementById('main')?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
    scrollToBottom: () => {
      document.getElementById('main')?.scrollTo({
        top: document.getElementById('main')?.scrollHeight,
        behavior: 'smooth',
      });
    },
  };
};

export default useScroll;
