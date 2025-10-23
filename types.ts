export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}

export type AppFeature = 'coloringBook' | 'imageEditor' | 'videoGenerator' | 'liveChat' | 'storyBooster';