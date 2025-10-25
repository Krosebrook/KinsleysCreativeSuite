export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}

export type AppFeature = 'coloringBook' | 'imageEditor' | 'videoGenerator' | 'liveChat' | 'storyBooster' | 'stickerMaker';

// Fix: Moved AIStudio interface and window augmentation here from VideoGenerator.tsx
// to resolve a TypeScript error about subsequent property declarations. This ensures
// a single, global definition for the window.aistudio object.
// FIX: Define AIStudio within `declare global` to resolve "Subsequent property declarations" error.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}