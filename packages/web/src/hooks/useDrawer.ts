import { create } from 'zustand';

const useDrawerState = create<{
  opened: boolean;
  switchOpen: () => void;
}>((set) => {
  return {
    opened: false,
    switchOpen: () => {
      set((state) => ({
        opened: !state.opened,
      }));
    },
  };
});

const useDrawer = () => {
  const [opened, switchOpen] = useDrawerState((state) => [
    state.opened,
    state.switchOpen,
  ]);

  return {
    opened,
    switchOpen,
  };
};

export default useDrawer;
