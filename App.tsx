import React, { useState, useMemo } from 'react';
import { createChat } from './services/geminiService';
import { Chatbot } from './components/Chatbot';
import type { Chat } from '@google/genai';
import { ColoringBookGenerator } from './components/ColoringBookGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoGenerator } from './components/VideoGenerator';
import { LiveChat } from './components/LiveChat';
import { StoryBooster } from './components/StoryBooster';
import { BrushIcon, ImageIcon, VideoIcon, MicIcon, BookOpenIcon } from './components/icons';
import type { AppFeature } from './types';

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
      isActive ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm hover:shadow-md'
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
    storyBooster: { icon: BookOpenIcon, label: "Story Booster" },
    videoGenerator: { icon: VideoIcon, label: "Video Generator" },
    liveChat: { icon: MicIcon, label: "Live Chat" },
};
const features = Object.keys(featureMap) as AppFeature[];


export default function App() {
  const [activeFeature, setActiveFeature] = useState<AppFeature>('coloringBook');
  
  const chatInstance = useMemo<Chat>(() => createChat(), []);

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'coloringBook': return <ColoringBookGenerator />;
      case 'imageEditor': return <ImageEditor />;
      case 'videoGenerator': return <VideoGenerator />;
      case 'liveChat': return <LiveChat />;
      case 'storyBooster': return <StoryBooster />;
      default: return <ColoringBookGenerator />;
    }
  };
  
  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-100">
      <main className="container mx-auto px-4 py-8 md:py-12">

        <div className="max-w-4xl mx-auto mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-center text-slate-800 mb-2">Gemini Creative Suite</h1>
            <p className="text-lg text-slate-500 text-center mb-8">Your all-in-one AI-powered creative toolkit.</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
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

      <footer className="text-center py-6 text-sm text-slate-500">
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