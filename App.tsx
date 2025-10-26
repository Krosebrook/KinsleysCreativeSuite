import React, { useState } from 'react';
import { Chatbot } from './components/Chatbot';
import { ColoringBookGenerator } from './components/ColoringBookGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoGenerator } from './components/VideoGenerator';
import { LiveChat } from './components/LiveChat';
import { StoryBooster } from './components/StoryBooster';
import { StickerMaker } from './components/StickerMaker';
import { ProjectHub } from './components/ProjectHub';
import { ProjectDetail } from './components/ProjectDetail';
import { StoryboardGenerator } from './components/StoryboardGenerator';
import { NarrationTool } from './components/NarrationTool';
import { OnboardingTour } from './components/OnboardingTour';
import { SunIcon, MoonIcon, SparklesIcon } from './components/icons';
import type { AppFeature } from './types';
import { dataURLtoFile } from './utils/helpers';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    React.useEffect(() => {
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

const AppContent: React.FC = () => {
  const { activeProjectId, activeProject, setActiveProjectId } = useProjects();
  const [activeFeature, setActiveFeature] = useState<AppFeature | null>(null);

  // State for passing data between tools
  const [initialVideoGeneratorImage, setInitialVideoGeneratorImage] = useState<{b64: string, file: File} | null>(null);
  const [stickerToSendToEditor, setStickerToSendToEditor] = useState<string | null>(null);
  const [initialColoringPageImage, setInitialColoringPageImage] = useState<string | null>(null);
  const [initialColoringBookPrompt, setInitialColoringBookPrompt] = useState<string | null>(null);
  const [initialStoryForStoryboard, setInitialStoryForStoryboard] = useState<string | null>(null);
  const [initialTextForNarration, setInitialTextForNarration] = useState<string | null>(null);
  
  const handleLaunchTool = (feature: AppFeature) => {
    if (activeProjectId) {
      // Clear any stale initial data when launching a tool
      setInitialVideoGeneratorImage(null);
      setStickerToSendToEditor(null);
      setInitialColoringPageImage(null);
      setInitialColoringBookPrompt(null);
      setInitialStoryForStoryboard(null);
      setInitialTextForNarration(null);
      setActiveFeature(feature);
    }
  };

  const handleBackToHub = () => {
    setActiveProjectId(null);
    setActiveFeature(null);
  };
  
  const handleBackToProject = () => {
    setActiveFeature(null);
    // Clear initial data when returning to project view
    setInitialVideoGeneratorImage(null);
    setStickerToSendToEditor(null);
    setInitialColoringPageImage(null);
    setInitialColoringBookPrompt(null);
    setInitialStoryForStoryboard(null);
    setInitialTextForNarration(null);
  };

  // Handlers for cross-feature actions
  const handleSendToVideoGenerator = (imageData: { b64: string; mimeType: string }) => {
    const file = dataURLtoFile(`data:${imageData.mimeType};base64,${imageData.b64}`, 'edited-image.png');
    setInitialVideoGeneratorImage({ b64: imageData.b64, file });
    setActiveFeature('videoGenerator');
  };
  
  const handleSendStickerToEditor = (stickerB64: string) => {
    setStickerToSendToEditor(stickerB64);
    setActiveFeature('imageEditor');
  };

  const handleConvertToColoringPage = (newImageB64: string) => {
    setInitialColoringPageImage(newImageB64);
    setActiveFeature('coloringBook');
  };

  const handleGenerateColoringPagesFromStory = (storyText: string) => {
    setInitialColoringBookPrompt(storyText);
    setActiveFeature('coloringBook');
  };

  const handleCreateStoryboardFromStory = (storyText: string) => {
    setInitialStoryForStoryboard(storyText);
    setActiveFeature('storyboardGenerator');
  };

  const handleNarrateStory = (storyText: string) => {
    setInitialTextForNarration(storyText);
    setActiveFeature('narrationTool');
  };

  const renderContent = () => {
    if (activeProjectId && activeProject) {
        if (activeFeature) {
            switch (activeFeature) {
                case 'imageEditor': return <ImageEditor onBack={handleBackToProject} onSendToVideoGenerator={handleSendToVideoGenerator} incomingStickerB64={stickerToSendToEditor} onConvertToColoringPage={handleConvertToColoringPage} />;
                case 'stickerMaker': return <StickerMaker onSendToEditor={handleSendStickerToEditor} />;
                case 'videoGenerator': return <VideoGenerator initialImage={initialVideoGeneratorImage} />;
                case 'liveChat': return <LiveChat />;
                case 'storyBooster': return <StoryBooster onGenerateColoringPages={handleGenerateColoringPagesFromStory} onNarrateStory={handleNarrateStory} />;
                case 'coloringBook': return <ColoringBookGenerator initialPrompt={initialColoringBookPrompt} initialImage={initialColoringPageImage} />;
                case 'storyboardGenerator': return initialStoryForStoryboard ? <StoryboardGenerator storyText={initialStoryForStoryboard} onBack={handleBackToProject} /> : <ProjectDetail onLaunchTool={handleLaunchTool} onBackToHub={handleBackToHub} onCreateStoryboard={handleCreateStoryboardFromStory} />;
                case 'narrationTool': return <NarrationTool initialText={initialTextForNarration} onBack={handleBackToProject} />;
                default: return <ProjectDetail onLaunchTool={handleLaunchTool} onBackToHub={handleBackToHub} onCreateStoryboard={handleCreateStoryboardFromStory} />;
            }
        }
        return <ProjectDetail onLaunchTool={handleLaunchTool} onBackToHub={handleBackToHub} onCreateStoryboard={handleCreateStoryboardFromStory} />;
    }
    return <ProjectHub />;
  };
  
  return (
    <div className="min-h-screen font-sans">
      <OnboardingTour />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="max-w-6xl mx-auto mb-8 md:mb-12 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <SparklesIcon className="h-8 w-8 text-indigo-500" />
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
                    Gemini Creative Suite
                </h1>
            </div>
            <ThemeToggle />
        </header>
        
        <div className="animate-fade-in">
            {renderContent()}
        </div>
      </main>
      
      <Chatbot activeFeature={activeFeature} />
      
      <footer className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
        <p>Created with the power of Google Gemini.</p>
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

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}