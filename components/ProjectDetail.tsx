import React from 'react';
import type { Project, ProjectAsset, AppFeature } from '../types';
import { 
    ArrowLeftIcon, BrushIcon, ImageIcon, VideoIcon, MicIcon, BookOpenIcon, StickerIcon, TrashIcon,
    SparklesIcon
} from './icons';

interface ProjectDetailProps {
    project: Project;
    onLaunchTool: (feature: AppFeature) => void;
    onBackToHub: () => void;
    onDeleteProject: (projectId: string) => void;
}

const featureMap: Record<Exclude<AppFeature, 'projectHub'>, { icon: React.ElementType, label: string }> = {
    coloringBook: { icon: BrushIcon, label: "Coloring Book" },
    imageEditor: { icon: ImageIcon, label: "Image Editor" },
    stickerMaker: { icon: StickerIcon, label: "Sticker Maker" },
    storyBooster: { icon: BookOpenIcon, label: "Story Booster" },
    videoGenerator: { icon: VideoIcon, label: "Video Generator" },
    liveChat: { icon: MicIcon, label: "Live Chat" },
};
const features = Object.keys(featureMap) as Exclude<AppFeature, 'projectHub'>[];

const AssetCard: React.FC<{ asset: ProjectAsset }> = ({ asset }) => {
    // FIX: 'coloringPage' is not a valid AssetType. Removed it from the check.
    const isImage = asset.type === 'image' || asset.type === 'sticker';
    
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            {isImage && (
                <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 overflow-hidden">
                    <img src={`data:image/png;base64,${asset.data}`} alt={asset.name} className="w-full h-full object-cover" />
                </div>
            )}
            <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{asset.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{asset.type}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(parseInt(asset.id)).toLocaleString()}</p>
        </div>
    );
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onLaunchTool, onBackToHub, onDeleteProject }) => {
    const assetsByType = project.assets.reduce((acc, asset) => {
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
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{project.name}</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 max-w-2xl">{project.description}</p>
                </div>
                <button onClick={() => onDeleteProject(project.id)} className="flex items-center space-x-2 text-sm font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete Project</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column for tools */}
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

                {/* Right column for assets */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl min-h-[60vh]">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Project Assets ({project.assets.length})</h2>
                        {project.assets.length > 0 ? (
                            <div className="space-y-6">
                                {/* FIX: Changed from Object.entries to Object.keys to improve type inference and resolve 'map does not exist on unknown' error. */}
                                {Object.keys(assetsByType).map((type) => (
                                    <div key={type}>
                                        <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-3 capitalize border-b border-slate-200 dark:border-slate-700 pb-2">{type}s</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {assetsByType[type].map(asset => <AssetCard key={asset.id} asset={asset} />)}
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