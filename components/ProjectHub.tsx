import React, { useState } from 'react';
import type { Project, AppFeature } from '../types';
import { SparklesIcon, FolderPlusIcon, FolderKanbanIcon, ImageIcon, BookOpenIcon } from './icons';
import { useProjects } from '../contexts/ProjectContext';
import { CreateProjectModal } from './modals/CreateProjectModal';

const ProjectCard: React.FC<{
  project: Project;
  onSelect: () => void;
  onLaunchTool: (feature: AppFeature) => void;
}> = ({ project, onSelect, onLaunchTool }) => {
    const recentImageAsset = project.assets.find(a => ['image', 'sticker', 'character', 'style'].includes(a.type));
    
    return (
        <div className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
            <button 
                onClick={onSelect} 
                className="p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 rounded-t-2xl flex-grow text-left"
                aria-label={`Open project ${project.name}`}
            >
                <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {recentImageAsset ? (
                        <img src={`data:image/png;base64,${recentImageAsset.data}`} alt="Project preview" className="w-full h-full object-cover" />
                    ) : (
                        <FolderKanbanIcon className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                    )}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm h-10 overflow-hidden">{project.description || 'No description'}</p>
            </button>
            
            <div className="px-6 pb-4 mt-auto border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center pt-3">
                     <p className="text-xs text-slate-400 dark:text-slate-500">{project.assets.length} assets</p>
                     <div className="flex items-center space-x-1">
                        <button
                            onClick={() => onLaunchTool('imageEditor')}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                            title="Launch Image Editor"
                            aria-label="Launch Image Editor"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onLaunchTool('storyBooster')}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                            title="Launch Story Booster"
                            aria-label="Launch Story Booster"
                        >
                            <BookOpenIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface ProjectHubProps {
    onLaunchTool: (projectId: string, feature: AppFeature) => void;
}

export const ProjectHub: React.FC<ProjectHubProps> = ({ onLaunchTool }) => {
    const { projects, createProject, setActiveProjectId } = useProjects();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            {isModalOpen && <CreateProjectModal onClose={() => setIsModalOpen(false)} onCreate={(name, desc) => { createProject(name, desc); setIsModalOpen(false); }} />}
            
            <header className="flex justify-between items-center mb-10 md:mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Your Projects</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Create, manage, and organize all your creative work.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-lg">
                    <FolderPlusIcon className="w-5 h-5" />
                    <span>New Project</span>
                </button>
            </header>

            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map(p => (
                        <ProjectCard 
                            key={p.id} 
                            project={p} 
                            onSelect={() => setActiveProjectId(p.id)} 
                            onLaunchTool={(feature) => onLaunchTool(p.id, feature)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <FolderKanbanIcon className="w-20 h-20 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Welcome to Your Creative Hub!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">You don't have any projects yet. Let's create your first one.</p>
                    <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-lg">
                        Create Your First Project
                    </button>
                </div>
            )}
        </>
    );
};