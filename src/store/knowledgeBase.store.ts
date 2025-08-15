import { create } from 'zustand';

export interface KnowledgeBaseState {
  files: File[];
  links: string[];
  prompts: string;
  addFile: (file: File) => void;
  addLink: (link: string) => void;
  removeFile: (fileName: string) => void;
  removeLink: (index: number) => void;
  updateLink: (index: number, newLink: string) => void;
  setFiles: (files: File[]) => void;
  setPrompts: (prompts: string) => void;
  isUpdating: boolean;
  lastUpdated: Date | null;
  updateKnowledgeBase: () => Promise<void>;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  files: [],
  links: [],
  prompts: '',
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  addLink: (link) => set((state) => ({ links: [...state.links, link] })),
  removeFile: (fileName) =>
    set((state) => ({ files: state.files.filter((f) => f.name !== fileName) })),
  removeLink: (index) =>
    set((state) => ({ links: state.links.filter((_, i) => i !== index) })),
  updateLink: (index, newLink) =>
    set((state) => ({
      links: state.links.map((link, i) => (i === index ? newLink : link)),
    })),
  setFiles: (files) => set({ files }),
  setPrompts: (prompts) => set({ prompts }),
  isUpdating: false,
  lastUpdated: null,
  updateKnowledgeBase: async () => {
    set({ isUpdating: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    set({ isUpdating: false, lastUpdated: new Date() });
  },
}));
