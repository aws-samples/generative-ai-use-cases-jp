const useScroll = () => {
  return {
    scrollToTop: (elementId: string = 'main') => {
      document.getElementById(elementId)?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
    scrollToBottom: (elementId: string = 'main') => {
      document.getElementById(elementId)?.scrollTo({
        top: document.getElementById(elementId)?.scrollHeight,
        behavior: 'smooth',
      });
    },
  };
};

export default useScroll;
