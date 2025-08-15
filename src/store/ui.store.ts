import { create } from 'zustand';

export interface UiState {
  currentContext: string;
  setCurrentContext: (context: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentContext: 'דף הבית',
  setCurrentContext: (context) => set({ currentContext: context }),
}));
