import { type Blob } from "@google/genai";

export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
  imageB64?: string;
  mimeType?: string;
  timestamp: number;
}

export type AppFeature = 'projectHub' | 'coloringBook' | 'imageEditor' | 'videoGenerator' | 'liveChat' | 'storyBooster' | 'stickerMaker' | 'storyboardGenerator' | 'narrationTool';

export interface StoryboardScene {
  scene_description: string;
  image_prompt: string;
  characters_mentioned: string[];
}

// NEW: For Storyboard-to-Video workflow
export interface StoryboardVideoClip {
    status: 'pending' | 'loading' | 'done' | 'error';
    url?: string;
    videoObject?: any;
    error?: string;
    sceneIndex: number;
}

export interface Style {
  id: string;
  name: string;
  imageB64: string;
}

export interface Character {
  id: string;
  name: string;
  imageB64: string;
  prompt: string;
}

export interface Layer {
  id: string;
  name: string;
  imageB64: string;
}

export type AssetType = 'story' | 'image' | 'sticker' | 'video' | 'coloringBookPdf' | 'character' | 'style' | 'audio';

export interface ProjectAsset {
  id: string; // e.g., timestamp
  type: AssetType;
  name: string; // e.g., "Main character design", "Chapter 1 Draft"
  data: string; // story text, base64 image, video URL, pdf URL, audio base64
  prompt?: string; // The prompt used to generate it
  thumb?: string; // A thumbnail b64, for videos or PDFs
}

export interface Project {
  id: string;
  name: string;
  description: string;
  lastModified: number;
  assets: ProjectAsset[];
  characterSheet: Character[]; // For character consistency
  stylePalette: Style[]; // NEW: For style consistency
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