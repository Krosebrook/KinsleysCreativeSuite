import type { Project } from '../types';

const PROJECTS_KEY = 'geminiCreativeSuite_projects';

export const loadProjects = (): Project[] => {
    try {
        const savedProjects = localStorage.getItem(PROJECTS_KEY);
        if (savedProjects) {
            // Sort by last modified date, newest first
            const projects: Project[] = JSON.parse(savedProjects);
            return projects.sort((a, b) => b.lastModified - a.lastModified);
        }
    } catch (error) {
        console.error("Failed to load or parse projects from localStorage:", error);
    }
    return [];
};

export const saveProjects = (projects: Project[]) => {
    try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error("Failed to save projects to localStorage:", error);
    }
};
