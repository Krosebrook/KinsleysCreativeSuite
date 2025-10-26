export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}

export type AppFeature = 'projectHub' | 'coloringBook' | 'imageEditor' | 'videoGenerator' | 'liveChat' | 'storyBooster' | 'stickerMaker';

// NEW: Project Hub types
export type AssetType = 'story' | 'image' | 'sticker' | 'video' | 'coloringBookPdf';

export interface ProjectAsset {
  id: string; // e.g., timestamp
  type: AssetType;
  name: string; // e.g., "Main character design", "Chapter 1 Draft"
  data: string; // story text, base64 image, video URL, pdf URL
  prompt?: string; // The prompt used to generate it
  thumb?: string; // A thumbnail b64, for videos or PDFs
}

export interface Project {
  id: string;
  name: string;
  description: string;
  lastModified: number;
  assets: ProjectAsset[];
}


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
