import React, { useState } from 'react';
import type { ProjectAsset, AppFeature, Character, Style } from '../types';
import { useProjects } from '../contexts/ProjectContext';
import { 
    ArrowLeftIcon, BrushIcon, ImageIcon, VideoIcon, MicIcon, BookOpenIcon, StickerIcon, TrashIcon,
    SparklesIcon, UserIcon, ClapperboardIcon, PaletteIcon, Volume2Icon, SaveIcon, CheckIcon
} from './icons';

interface ProjectDetailProps {
    onLaunchTool: (feature: AppFeature) => void;
    onBackToHub: () => void;
    onCreateStoryboard: (storyText: string) => void;
}

const featureMap: Record<Exclude<AppFeature, 'projectHub' | 'storyboardGenerator'>, { icon: React.ElementType, label: string }> = {
    coloringBook: { icon: BrushIcon, label: "Coloring Book" },
    imageEditor: { icon: ImageIcon, label: "Image Editor" },
    stickerMaker: { icon: StickerIcon, label: "Sticker Maker" },
    storyBooster: { icon: BookOpenIcon, label: "Story Booster" },
    narrationTool: { icon: Volume2Icon, label: "Narration Tool" },
    videoGenerator: { icon: VideoIcon, label: "Video Generator" },
    liveChat: { icon: MicIcon, label: "Live Chat" },
};
const features = Object.keys(featureMap) as Exclude<AppFeature, 'projectHub' | 'storyboardGenerator'>[];

const AssetCard: React.FC<{ asset: ProjectAsset, onCreateStoryboard: (storyText: string) => void, onDelete: (id: string) => void }> = ({ asset, onCreateStoryboard, onDelete }) => {
    const isImage = ['image', 'sticker', 'character', 'style'].includes(asset.type);
    
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col relative group">
             <button 
                onClick={() => onDelete(asset.id)} 
                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-700"
                aria-label="Delete asset"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
            {isImage && (
                <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 overflow-hidden">
                    <img src={`data:image/png;base64,${asset.data}`} alt={asset.name} className="w-full h-full object-cover" />
                </div>
            )}
            {asset.type === 'audio' && (
                 <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 flex items-center justify-center">
                    <Volume2Icon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                </div>
            )}
            <div className="flex-grow">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{asset.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{asset.type}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(parseInt(asset.id)).toLocaleString()}</p>
            </div>
            {asset.type === 'story' && (
                <button 
                    onClick={() => onCreateStoryboard(asset.data)}
                    className="mt-3 w-full flex items-center justify-center space-x-2 bg-purple-600 text-white font-semibold text-sm py-2 px-3 rounded-lg hover:bg-purple-700 transition"
                >
                    <ClapperboardIcon className="w-4 h-4" />
                    <span>Create Storyboard</span>
                </button>
            )}
        </div>
    );
};

const CharacterCard: React.FC<{ character: Character, onDelete: (id: string) => void }> = ({ character, onDelete }) => (
    <div className="flex-shrink-0 w-32 text-center group relative">
        <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2 overflow-hidden">
            <img src={`data:image/png;base64,${character.imageB64}`} alt={character.name} className="w-full h-full object-cover" />
        </div>
        <button 
            onClick={() => onDelete(character.id)} 
            className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-700"
            aria-label="Delete character"
        >
            <TrashIcon className="w-4 h-4" />
        </button>
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{character.name}</h4>
    </div>
);

const StyleCard: React.FC<{ style: Style, onDelete: (id: string) => void }> = ({ style, onDelete }) => (
    <div className="flex-shrink-0 w-32 text-center group relative">
        <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2 overflow-hidden">
            <img src={`data:image/png;base64,${style.imageB64}`} alt={style.name} className="w-full h-full object-cover" />
        </div>
         <button 
            onClick={() => onDelete(style.id)} 
            className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-700"
            aria-label="Delete style"
        >
            <TrashIcon className="w-4 h-4" />
        </button>
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{style.name}</h4>
    </div>
);

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ onLaunchTool, onBackToHub, onCreateStoryboard }) => {
    const { activeProject, deleteProject, deleteAsset, save } = useProjects();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');

    const handleSave = () => {
        if (saveStatus === 'saving') return;
        setSaveStatus('saving');
        save();
        setTimeout(() => {
            setSaveStatus('idle');
        }, 2000); // Show "Saved!" for 2 seconds
    };
    
    if (!activeProject) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold">Project Not Found</h1>
                <p className="text-slate-500 mt-2">This project may have been deleted.</p>
                <button onClick={onBackToHub} className="mt-4 flex items-center mx-auto space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Return to All Projects</span>
                </button>
            </div>
        );
    }
    
    const assetsByType = activeProject.assets.reduce((acc, asset) => {
        const type = asset.type;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(asset);
        return acc;
    }, {} as Record<string, ProjectAsset[]>);

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex items-start justify-between mb-10 md:mb-12">
                <button onClick={onBackToHub} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>All Projects</span>
                </button>
                <div className="text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{activeProject.name}</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 max-w-2xl">{activeProject.description}</p>
                </div>
                 <div className="flex items-center space-x-2">
                   <button 
                       onClick={handleSave} 
                       className={`flex items-center space-x-2 text-sm font-semibold px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                            saveStatus === 'saving' 
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 focus:ring-green-500 scale-105' 
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900 focus:ring-indigo-500'
                        }`}
                   >
                       {saveStatus === 'saving' ? (
                           <>
                               <CheckIcon className="w-4 h-4" />
                               <span>Project Saved!</span>
                           </>
                       ) : (
                           <>
                               <SaveIcon className="w-4 h-4" />
                               <span>Save Project</span>
                           </>
                       )}
                   </button>
                   <button onClick={() => deleteProject(activeProject.id)} className="flex items-center space-x-2 text-sm font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                       <TrashIcon className="w-4 h-4" />
                       <span>Delete Project</span>
                   </button>
               </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl sticky top-8">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
                            <SparklesIcon className="w-6 h-6 text-indigo-500" />
                            <span>Creative Tools</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {features.map(featureKey => (
                                <button key={featureKey} onClick={() => onLaunchTool(featureKey)} className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-slate-700 dark:text-slate-300">
                                    <featureMap[featureKey].icon className="w-8 h-8 mb-2" />
                                    <span className="text-sm font-semibold text-center">{featureMap[featureKey].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
                            <UserIcon className="w-6 h-6 text-amber-500" />
                            <span>Character Sheet</span>
                        </h2>
                        {activeProject.characterSheet && activeProject.characterSheet.length > 0 ? (
                            <div className="flex space-x-4 overflow-x-auto pb-2 -mb-2">
                                {activeProject.characterSheet.map(char => <CharacterCard key={char.id} character={char} onDelete={deleteAsset} />)}
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400">No characters yet. Go to the Image Editor to create and save one!</p>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
                            <PaletteIcon className="w-6 h-6 text-teal-500" />
                            <span>Style Palette</span>
                        </h2>
                        {activeProject.stylePalette && activeProject.stylePalette.length > 0 ? (
                            <div className="flex space-x-4 overflow-x-auto pb-2 -mb-2">
                                {activeProject.stylePalette.map(style => <StyleCard key={style.id} style={style} onDelete={deleteAsset} />)}
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400">No styles saved. Go to the Image Editor to save a visual style!</p>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl min-h-[40vh]">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Project Assets ({activeProject.assets.length})</h2>
                        {activeProject.assets.length > 0 ? (
                            <div className="space-y-6">
                                {Object.keys(assetsByType).map((type) => (
                                    <div key={type}>
                                        <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-3 capitalize border-b border-slate-200 dark:border-slate-700 pb-2">{type}s</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {assetsByType[type].map(asset => <AssetCard key={asset.id} asset={asset} onCreateStoryboard={onCreateStoryboard} onDelete={deleteAsset} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-slate-500 dark:text-slate-400">Your project is empty.</p>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">Use the tools on the left to start creating!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};