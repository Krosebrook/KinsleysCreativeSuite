import React, { useState, useMemo, useEffect } from 'react';
import { createChat } from './services/geminiService';
import { loadProjects, saveProjects } from './services/projectService';
import { Chatbot } from './components/Chatbot';
import type { Chat } from '@google/genai';
import { ColoringBookGenerator } from './components/ColoringBookGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoGenerator } from './components/VideoGenerator';
import { LiveChat } from './components/LiveChat';
import { StoryBooster } from './components/StoryBooster';
import { StickerMaker } from './components/StickerMaker';
import { ProjectHub } from './components/ProjectHub';
import { ProjectDetail } from './components/ProjectDetail';
import { SunIcon, MoonIcon, SparklesIcon } from './components/icons';
import type { AppFeature, Project, ProjectAsset } from './types';
import { dataURLtoFile } from './utils/helpers';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<AppFeature | null>(null);

  const [initialVideoGeneratorImage, setInitialVideoGeneratorImage] = useState<{b64: string, file: File} | null>(null);
  const [stickerToSendToEditor, setStickerToSendToEditor] = useState<string | null>(null);
  
  const chatInstance = useMemo<Chat>(() => createChat(), []);

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);
  
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const handleCreateProject = (name: string, description: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      description,
      lastModified: Date.now(),
      assets: [],
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project and all its assets? This cannot be undone.')) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProjectId === projectId) {
            setActiveProjectId(null);
        }
    }
  };

  const handleAddAsset = (asset: ProjectAsset) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
            return { 
                ...p, 
                assets: [asset, ...p.assets],
                lastModified: Date.now(),
            };
        }
        return p;
    }));
    setActiveFeature(null); // Return to project detail view after saving
  };
  
  const handleLaunchTool = (feature: AppFeature) => {
    if (activeProjectId) {
      setActiveFeature(feature);
    }
  };

  const handleBackToHub = () => {
    setActiveProjectId(null);
    setActiveFeature(null);
  };
  
  const handleBackToProject = () => {
    setActiveFeature(null);
  };

  // Handlers for cross-feature actions from within a project context
   const handleSendToVideoGenerator = (imageData: { b64: string; mimeType: string }) => {
    const file = dataURLtoFile(`data:${imageData.mimeType};base64,${imageData.b64}`, 'edited-image.png');
    setInitialVideoGeneratorImage({ b64: imageData.b64, file });
    setActiveFeature('videoGenerator');
  };
  
  const handleSendStickerToEditor = (stickerB64: string) => {
    setStickerToSendToEditor(stickerB64);
    setActiveFeature('imageEditor');
  };

  const renderContent = () => {
    if (activeProjectId && activeProject) {
        if (activeFeature) {
            switch (activeFeature) {
                case 'imageEditor': return <ImageEditor project={activeProject} onSaveAsset={handleAddAsset} onBack={handleBackToProject} onSendToVideoGenerator={handleSendToVideoGenerator} incomingStickerB64={stickerToSendToEditor} />;
                case 'stickerMaker': return <StickerMaker onSendToEditor={handleSendStickerToEditor} />;
                case 'videoGenerator': return <VideoGenerator initialImage={initialVideoGeneratorImage} />;
                case 'liveChat': return <LiveChat />;
                case 'storyBooster': return <StoryBooster onGenerateColoringPages={() => {}} />;
                case 'coloringBook': return <ColoringBookGenerator />;
                // default case can show project detail or a message
                default: return <ProjectDetail project={activeProject} onLaunchTool={handleLaunchTool} onBackToHub={handleBackToHub} onDeleteProject={handleDeleteProject} />;
            }
        }
        return <ProjectDetail project={activeProject} onLaunchTool={handleLaunchTool} onBackToHub={handleBackToHub} onDeleteProject={handleDeleteProject} />;
    }
    return <ProjectHub projects={projects} onCreateProject={handleCreateProject} onSelectProject={setActiveProjectId} />;
  };
  
  return (
    <div className="min-h-screen font-sans">
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
      
      <Chatbot chatInstance={chatInstance} />
      
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
