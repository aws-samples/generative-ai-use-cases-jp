import { create } from 'zustand';

const usePageTitleState = create<{
  pageTitle: string;
  setPageTitle: (s: string) => void;
}>((set) => {
  return {
    pageTitle: '',
    setPageTitle: (s) => {
      set({
        pageTitle: s,
      });
    },
  };
});

const usePageTitle = () => {
  const { pageTitle, setPageTitle } = usePageTitleState();

  return {
    pageTitle,
    setPageTitle,
  };
};

export default usePageTitle;
