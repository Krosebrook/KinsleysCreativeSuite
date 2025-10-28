import React, { createContext, useState, useEffect, useMemo, useContext, type ReactNode } from 'react';
import { loadProjects, saveProjects } from '../services/projectService';
import type { Project, ProjectAsset, Character, Style } from '../types';

interface ProjectContextType {
    projects: Project[];
    activeProject: Project | null;
    activeProjectId: string | null;
    setActiveProjectId: (id: string | null) => void;
    createProject: (name: string, description: string) => void;
    deleteProject: (id: string) => void;
    addAsset: (asset: ProjectAsset) => void;
    deleteAsset: (assetId: string) => void; // New
    addCharacter: (characterData: Omit<Character, 'id'>) => void;
    addStyle: (styleData: Omit<Style, 'id'>) => void;
    save: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    useEffect(() => {
        setProjects(loadProjects());
    }, []);

    useEffect(() => {
        saveProjects(projects);
    }, [projects]);
    
    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId) || null;
    }, [projects, activeProjectId]);

    const handleSave = () => {
        saveProjects(projects);
    };

    const createProject = (name: string, description: string) => {
        const newProject: Project = {
            id: Date.now().toString(),
            name,
            description,
            lastModified: Date.now(),
            assets: [],
            characterSheet: [],
            stylePalette: [],
        };
        const updatedProjects = [newProject, ...projects];
        setProjects(updatedProjects);
        setActiveProjectId(newProject.id);
    };

    const deleteProject = (projectId: string) => {
        if (window.confirm('Are you sure you want to delete this project and all its assets? This cannot be undone.')) {
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (activeProjectId === projectId) {
                setActiveProjectId(null);
            }
        }
    };

    const addAsset = (asset: ProjectAsset) => {
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
    };
    
    const deleteAsset = (assetId: string) => {
        if (!activeProjectId) return;
        if (!window.confirm('Are you sure you want to delete this asset?')) return;

        setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
                const assetToDelete = p.assets.find(a => a.id === assetId);
                if (!assetToDelete) return p;

                const updatedAssets = p.assets.filter(a => a.id !== assetId);
                let updatedCharacterSheet = p.characterSheet;
                let updatedStylePalette = p.stylePalette;

                if (assetToDelete.type === 'character') {
                    updatedCharacterSheet = p.characterSheet.filter(c => c.id !== assetId);
                }
                if (assetToDelete.type === 'style') {
                    updatedStylePalette = p.stylePalette.filter(s => s.id !== assetId);
                }

                return {
                    ...p,
                    assets: updatedAssets,
                    characterSheet: updatedCharacterSheet,
                    stylePalette: updatedStylePalette,
                    lastModified: Date.now(),
                };
            }
            return p;
        }));
    };

    const addCharacter = (characterData: Omit<Character, 'id'>) => {
        if (!activeProjectId) return;
        
        const newCharacter: Character = {
            id: Date.now().toString() + '_char',
            ...characterData,
        };

        const newAsset: ProjectAsset = {
            id: newCharacter.id,
            type: 'character',
            name: `Character: ${characterData.name}`,
            data: characterData.imageB64,
            prompt: characterData.prompt,
        };

        setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
                return {
                    ...p,
                    characterSheet: [...(p.characterSheet || []), newCharacter],
                    assets: [newAsset, ...p.assets],
                    lastModified: Date.now(),
                };
            }
            return p;
        }));
    };

    const addStyle = (styleData: Omit<Style, 'id'>) => {
        if (!activeProjectId) return;

        const newStyle: Style = {
            id: Date.now().toString() + '_style',
            ...styleData,
        };

        const newAsset: ProjectAsset = {
            id: newStyle.id,
            type: 'style',
            name: `Style: ${styleData.name}`,
            data: styleData.imageB64,
        };

        setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
                return {
                    ...p,
                    stylePalette: [...(p.stylePalette || []), newStyle],
                    assets: [newAsset, ...p.assets],
                    lastModified: Date.now(),
                };
            }
            return p;
        }));
    };

    const value = {
        projects,
        activeProject,
        activeProjectId,
        setActiveProjectId,
        createProject,
        deleteProject,
        addAsset,
        deleteAsset,
        addCharacter,
        addStyle,
        save: handleSave,
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};