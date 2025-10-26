import React, { useState } from 'react';
import type { Project } from '../types';
import { SparklesIcon, FolderPlusIcon, FolderKanbanIcon } from './icons';
import { useProjects } from '../contexts/ProjectContext';
import { CreateProjectModal } from './modals/CreateProjectModal';

const ProjectCard: React.FC<{ project: Project; onSelect: () => void }> = ({ project, onSelect }) => {
    const firstImageAsset = project.assets.find(a => a.type === 'image');
    
    return (
        <button onClick={onSelect} className="w-full text-left bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
            <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {firstImageAsset ? (
                    <img src={`data:image/png;base64,${firstImageAsset.data}`} alt="Project preview" className="w-full h-full object-cover" />
                ) : (
                    <FolderKanbanIcon className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2 h-10 overflow-hidden">{project.description || 'No description'}</p>
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>{project.assets.length} assets</span>
                <span>{new Date(project.lastModified).toLocaleDateString()}</span>
            </div>
        </button>
    );
};


export const ProjectHub: React.FC = () => {
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
                    {projects.map(p => <ProjectCard key={p.id} project={p} onSelect={() => setActiveProjectId(p.id)} />)}
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