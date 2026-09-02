import { create } from 'zustand';
import { ViewMode } from '../../editor/modes/view-mode';

export type AppTheme = 'light' | 'dark' | 'system';

export interface SettingsState {
  theme: AppTheme;
  mode: ViewMode;
  sidebarOpen: boolean;
  outlineOpen: boolean;
  typewriterMode: boolean;
  focusMode: 'off' | 'sentence' | 'paragraph';
  fontSize: number;
  lineMeasure: string;

  setTheme: (theme: AppTheme) => void;
  setMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  toggleOutline: () => void;
  toggleTypewriter: () => void;
  setFocusMode: (mode: 'off' | 'sentence' | 'paragraph') => void;
  setFontSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'light',
  mode: 'hybrid',
  sidebarOpen: true,
  outlineOpen: false,
  typewriterMode: false,
  focusMode: 'off',
  fontSize: 16,
  lineMeasure: '72ch',

  setTheme: (theme) => set({ theme }),
  setMode: (mode) => set({ mode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleOutline: () => set((state) => ({ outlineOpen: !state.outlineOpen })),
  toggleTypewriter: () => set((state) => ({ typewriterMode: !state.typewriterMode })),
  setFocusMode: (focusMode) => set({ focusMode }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
