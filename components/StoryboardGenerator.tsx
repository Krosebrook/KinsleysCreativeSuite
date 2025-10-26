import React, { useState, useEffect, useCallback } from 'react';
import { generateStoryboardPrompts, generateStoryImage } from '../services/geminiService';
import { useProjects } from '../contexts/ProjectContext';
import type { StoryboardScene, ProjectAsset } from '../types';
import { LoaderIcon, SparklesIcon, ClapperboardIcon, ArrowLeftIcon, SaveIcon, PaletteIcon, RefreshCwIcon, AlertTriangleIcon } from './icons';

interface StoryboardGeneratorProps {
    storyText: string;
    onBack: () => void;
}

type ImageGenerationStatus = {
    status: 'pending' | 'loading' | 'done' | 'error';
    data: string | null;
    error?: string;
};

type CharacterAssignments = Record<number, Record<string, string>>; // { sceneIndex: { characterName: characterId } }

export const StoryboardGenerator: React.FC<StoryboardGeneratorProps> = ({ storyText, onBack }) => {
    const { activeProject, addAsset } = useProjects();
    
    const [scenes, setScenes] = useState<StoryboardScene[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [assignments, setAssignments] = useState<CharacterAssignments>({});
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<ImageGenerationStatus[]>([]);
    
    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const generatedScenes = await generateStoryboardPrompts(storyText);
                setScenes(generatedScenes);
                setGeneratedImages(new Array(generatedScenes.length).fill(null).map(() => ({ status: 'pending', data: null })));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate storyboard prompts.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrompts();
    }, [storyText]);

    const handleAssignmentChange = (sceneIndex: number, characterName: string, characterId: string) => {
        setAssignments(prev => ({
            ...prev,
            [sceneIndex]: {
                ...prev[sceneIndex],
                [characterName]: characterId,
            }
        }));
    };

    const handlePromptChange = (sceneIndex: number, newPrompt: string) => {
        setScenes(prev => {
            const newScenes = [...prev];
            newScenes[sceneIndex] = { ...newScenes[sceneIndex], image_prompt: newPrompt };
            return newScenes;
        });
    };
    
    const generateImageForScene = useCallback(async (sceneIndex: number) => {
        setGeneratedImages(prev => {
            const newImages = [...prev];
            newImages[sceneIndex] = { status: 'loading', data: null };
            return newImages;
        });

        try {
            const scene = scenes[sceneIndex];
            const style = activeProject?.stylePalette.find(s => s.id === selectedStyleId);
            
            const assignedCharacterImages = scene.characters_mentioned
                .map(name => {
                    const characterId = assignments[sceneIndex]?.[name];
                    const character = activeProject?.characterSheet.find(c => c.id === characterId);
                    return character ? character.imageB64 : null;
                })
                .filter((img): img is string => !!img);

            const imageB64 = await generateStoryImage(scene.image_prompt, assignedCharacterImages, style?.imageB64);
            
            setGeneratedImages(prev => {
                const newImages = [...prev];
                newImages[sceneIndex] = { status: 'done', data: imageB64 };
                return newImages;
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setGeneratedImages(prev => {
                const newImages = [...prev];
                newImages[sceneIndex] = { status: 'error', data: null, error: errorMessage };
                return newImages;
            });
        }
    }, [scenes, assignments, selectedStyleId, activeProject]);


    const handleGenerateAll = async () => {
        setIsGenerating(true);
        setError(null);
        
        // Run all image generations in parallel for a faster experience.
        await Promise.all(scenes.map((_, i) => {
            // Only generate images that haven't been generated yet or have errored.
            if (generatedImages[i]?.status === 'pending' || generatedImages[i]?.status === 'error') {
                return generateImageForScene(i);
            }
            return Promise.resolve();
        }));

        setIsGenerating(false);
    };

    const handleSaveToProject = () => {
        if (!activeProject) return;
        const successfullyGenerated = generatedImages.filter(img => img.status === 'done' && img.data);

        successfullyGenerated.forEach((imageResult) => {
            // Find original scene index to maintain correct naming
            const originalSceneIndex = generatedImages.findIndex(img => img === imageResult);
            if (originalSceneIndex !== -1 && imageResult.data) {
                const scene = scenes[originalSceneIndex];
                const assetName = `Storyboard: ${scene.scene_description.substring(0, 40)}${scene.scene_description.length > 40 ? '...' : ''}`;
                const newAsset: ProjectAsset = {
                    id: `${Date.now()}_${originalSceneIndex}`,
                    type: 'image',
                    name: assetName,
                    data: imageResult.data,
                    prompt: scene.image_prompt,
                };
                addAsset(newAsset);
            }
        });
        onBack();
    };

    // Check if all characters mentioned across all scenes have been assigned.
    const allCharactersAssigned = scenes.every((scene, index) => 
        scene.characters_mentioned.every(name => assignments[index]?.[name])
    );
    
    const hasGeneratedImages = generatedImages.some(img => img.status === 'done');

    return (
         <>
            <header className="flex items-center justify-between mb-10 md:mb-12">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Project</span>
                </button>
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        Story to Storyboard
                    </h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                        Assign characters, choose a style, and bring your story to life.
                    </p>
                </div>
                 {hasGeneratedImages && !isGenerating ? (
                    <button onClick={handleSaveToProject} className="flex items-center space-x-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition shadow-md">
                        <SaveIcon className="h-5 w-5" /><span>Save to Project</span>
                    </button>
                ) : <div className="w-36"></div> }
            </header>

            {isLoading && <div className="text-center"><LoaderIcon className="w-12 h-12 mx-auto" /><p>Gemini is analyzing your story...</p></div>}
            {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>}
            
            {!isLoading && !error && (
                <div className="space-y-8">
                    {/* --- Controls Panel --- */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">1. Configuration</h2>
                        {activeProject?.stylePalette && activeProject.stylePalette.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center"><PaletteIcon className="w-5 h-5 mr-2 text-teal-500"/>Choose a Visual Style</h3>
                                <div className="flex space-x-3 overflow-x-auto pb-2">
                                    {activeProject.stylePalette.map(style => (
                                        <button key={style.id} onClick={() => setSelectedStyleId(prev => prev === style.id ? '' : style.id)} className={`flex-shrink-0 p-1.5 rounded-lg border-2 transition ${selectedStyleId === style.id ? 'border-teal-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-500'}`}>
                                            <img src={`data:image/png;base64,${style.imageB64}`} alt={style.name} title={style.name} className="w-20 h-20 object-cover rounded-md" />
                                            <p className="text-xs font-semibold mt-1 truncate w-20">{style.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="text-center">
                            <button onClick={handleGenerateAll} disabled={isGenerating || !allCharactersAssigned} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center space-x-2 shadow-lg mx-auto">
                                {isGenerating ? <><LoaderIcon className="h-5 w-5" /><span>Generating...</span></> : <><SparklesIcon className="h-5 w-5" /><span>Generate All Scenes</span></>}
                            </button>
                            {!allCharactersAssigned && <p className="text-xs text-slate-500 mt-2">Please assign all mentioned characters in the scenes below to continue.</p>}
                        </div>
                    </div>

                    {/* --- Scenes Panel --- */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">2. Scenes & Assignments</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {scenes.map((scene, index) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-3 flex flex-col">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Scene {index + 1}</h3>
                                        {generatedImages[index]?.status !== 'loading' && (
                                            <button onClick={() => generateImageForScene(index)} className="flex items-center space-x-1 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline disabled:text-slate-400" disabled={isGenerating}>
                                                <RefreshCwIcon className="w-4 h-4" />
                                                <span>{generatedImages[index]?.status === 'done' || generatedImages[index]?.status === 'error' ? 'Regenerate' : 'Generate'}</span>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{scene.scene_description}"</p>
                                    <div className="flex-grow space-y-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image Prompt:</label>
                                            <textarea value={scene.image_prompt} onChange={(e) => handlePromptChange(index, e.target.value)} rows={3} className="w-full text-xs p-2 rounded-md bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500" />
                                        </div>
                                        {scene.characters_mentioned.length > 0 ? (
                                            <div className="space-y-2">
                                                {scene.characters_mentioned.map(name => (
                                                    <div key={name}>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assign "{name}":</label>
                                                        <select onChange={(e) => handleAssignmentChange(index, name, e.target.value)} value={assignments[index]?.[name] || ''} className="w-full px-3 py-2 bg-white dark:bg-slate-600 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                                            <option value="" disabled>Select a character...</option>
                                                            {activeProject?.characterSheet.map(char => (<option key={char.id} value={char.id}>{char.name}</option>))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-slate-500 dark:text-slate-400">No characters mentioned.</p>}
                                    </div>
                                    {/* --- Image Display --- */}
                                    <div className="bg-slate-200 dark:bg-slate-800 rounded-lg aspect-video flex items-center justify-center p-2 mt-2">
                                        {(() => {
                                            const imgStatus = generatedImages[index];
                                            switch (imgStatus?.status) {
                                                case 'loading': return <LoaderIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />;
                                                case 'done': return <img src={`data:image/png;base64,${imgStatus.data}`} alt={`Scene ${index + 1}`} className="w-full h-full object-contain rounded-md" />;
                                                case 'error': return <div className="text-center text-red-500"><AlertTriangleIcon className="w-8 h-8 mx-auto" /><p className="text-xs mt-1" title={imgStatus.error}>Generation Failed</p></div>;
                                                default: return <ClapperboardIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />;
                                            }
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};