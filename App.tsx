import React, { useState, useMemo, useEffect } from 'react';
import { createChat } from './services/geminiService';
import { Chatbot } from './components/Chatbot';
import type { Chat } from '@google/genai';
import { ColoringBookGenerator } from './components/ColoringBookGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoGenerator } from './components/VideoGenerator';
import { LiveChat } from './components/LiveChat';
import { StoryBooster } from './components/StoryBooster';
import { LandingPage } from './components/LandingPage';
import { BrushIcon, ImageIcon, VideoIcon, MicIcon, BookOpenIcon, SunIcon, MoonIcon, StickerIcon } from './components/icons';
import type { AppFeature } from './types';
import { dataURLtoFile } from './utils/helpers';
import { StickerMaker } from './components/StickerMaker';

interface NavButtonProps {
  Icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({
  Icon,
  label,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col md:flex-row items-center justify-center p-3 md:p-4 rounded-lg transition-all duration-300 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 shadow-sm hover:shadow-md'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    <Icon className="h-6 w-6 mb-1 md:mb-0 md:mr-2" />
    <span className="text-sm md:text-base font-semibold">{label}</span>
  </button>
);

const featureMap: Record<AppFeature, { icon: React.ElementType, label: string }> = {
    coloringBook: { icon: BrushIcon, label: "Coloring Book" },
    imageEditor: { icon: ImageIcon, label: "Image Editor" },
    stickerMaker: { icon: StickerIcon, label: "Sticker Maker" },
    storyBooster: { icon: BookOpenIcon, label: "Story Booster" },
    videoGenerator: { icon: VideoIcon, label: "Video Generator" },
    liveChat: { icon: MicIcon, label: "Live Chat" },
};
const features = Object.keys(featureMap) as AppFeature[];

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
        </button>
    );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeFeature, setActiveFeature] = useState<AppFeature>('coloringBook');
  
  // State for cross-feature integration
  const [initialColoringBookPrompt, setInitialColoringBookPrompt] = useState<string | null>(null);
  const [initialVideoGeneratorImage, setInitialVideoGeneratorImage] = useState<{b64: string, file: File} | null>(null);
  const [initialColoringPageImage, setInitialColoringPageImage] = useState<string | null>(null);
  const [stickerToSendToEditor, setStickerToSendToEditor] = useState<string | null>(null);


  const chatInstance = useMemo<Chat>(() => createChat(), []);

  const handleSignIn = () => setIsAuthenticated(true);
  const handleStartDemo = () => setIsAuthenticated(true);

  // Handlers for cross-feature actions
  const handleGenerateColoringPagesFromStory = (storyText: string) => {
    setInitialColoringBookPrompt(`Based on the following story, create a fun scene for a coloring page: "${storyText}"`);
    setActiveFeature('coloringBook');
  };

  const handleSendToVideoGenerator = (imageData: { b64: string; mimeType: string }) => {
    const file = dataURLtoFile(`data:${imageData.mimeType};base64,${imageData.b64}`, 'edited-image.png');
    setInitialVideoGeneratorImage({ b64: imageData.b64, file });
    setActiveFeature('videoGenerator');
  };
  
  const handleConvertToColoringPage = (newImageB64: string) => {
    setInitialColoringPageImage(newImageB64);
    setActiveFeature('coloringBook');
  };

  const handleSendStickerToEditor = (stickerB64: string) => {
    setStickerToSendToEditor(stickerB64);
    setActiveFeature('imageEditor');
  };


  // Effect to clear transient state when user navigates away
  useEffect(() => {
    if (activeFeature !== 'coloringBook' && initialColoringBookPrompt) {
      setInitialColoringBookPrompt(null);
    }
    if (activeFeature !== 'videoGenerator' && initialVideoGeneratorImage) {
      setInitialVideoGeneratorImage(null);
    }
     if (activeFeature !== 'coloringBook' && initialColoringPageImage) {
      setInitialColoringPageImage(null);
    }
    if (activeFeature !== 'imageEditor' && stickerToSendToEditor) {
      setStickerToSendToEditor(null);
    }
  }, [activeFeature]);

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'coloringBook': return <ColoringBookGenerator initialPrompt={initialColoringBookPrompt} initialImage={initialColoringPageImage} />;
      case 'imageEditor': return <ImageEditor onSendToVideoGenerator={handleSendToVideoGenerator} onConvertToColoringPage={handleConvertToColoringPage} incomingStickerB64={stickerToSendToEditor} />;
      case 'stickerMaker': return <StickerMaker onSendToEditor={handleSendStickerToEditor} />;
      case 'videoGenerator': return <VideoGenerator initialImage={initialVideoGeneratorImage} />;
      case 'liveChat': return <LiveChat />;
      case 'storyBooster': return <StoryBooster onGenerateColoringPages={handleGenerateColoringPagesFromStory} />;
      default: return <ColoringBookGenerator />;
    }
  };

  if (!isAuthenticated) {
    return <LandingPage onSignIn={handleSignIn} onStartDemo={handleStartDemo} />;
  }
  
  return (
    <div className="min-h-screen font-sans">
      <main className="container mx-auto px-4 py-8 md:py-12">

        <div className="max-w-5xl mx-auto mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">Gemini Creative Suite</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-8">Your all-in-one AI-powered creative toolkit.</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {features.map((feature) => (
                <NavButton 
                    key={feature}
                    Icon={featureMap[feature].icon} 
                    label={featureMap[feature].label} 
                    isActive={activeFeature === feature} 
                    onClick={() => setActiveFeature(feature)}
                />
            ))}
          </div>
        </div>
        
        <div className="animate-fade-in">
            {renderActiveFeature()}
        </div>

      </main>
      
      <Chatbot chatInstance={chatInstance} />

      <footer className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex justify-center items-center space-x-4">
            <p>Created with the power of Google Gemini.</p>
            <ThemeToggle />
        </div>
      </footer>
      
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}