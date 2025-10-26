import React, { useState } from 'react';
import { XIcon } from '../icons';

interface CreateProjectModalProps {
    onClose: () => void;
    onCreate: (name: string, description: string) => void;
}

interface ProjectTemplate {
    name: string;
    description: string;
}

const templates: ProjectTemplate[] = [
    { name: "Children's Book", description: "A project to write, illustrate, and storyboard a book for young readers." },
    { name: "Video Ad Script", description: "Develop a script, storyboard, and assets for a short video advertisement." },
    { name: "Comic Strip", description: "Create characters, a story, and a multi-panel storyboard for a web comic." },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name, description);
        }
    };

    const handleTemplateSelect = (template: ProjectTemplate) => {
        setName(template.name);
        setDescription(template.description);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                    <XIcon className="w-5 h-5" />
                </button>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 text-center">Create New Project</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start with a template (optional)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {templates.map(template => (
                                <button key={template.name} type="button" onClick={() => handleTemplateSelect(template)} className="p-2 text-sm text-center bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold transition">
                                    {template.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name</label>
                        <input id="projectName" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Sci-Fi Novel Illustrations" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="projectDesc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                        <textarea id="projectDesc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="A short description of your project's goals" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-lg">Create Project</button>
                </form>
            </div>
        </div>
    );
};
