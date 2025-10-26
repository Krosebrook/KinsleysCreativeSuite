import React, { useState, useEffect } from 'react';
import { generateStoryboardPrompts, generateStoryImage } from '../services/geminiService';
import { useProjects } from '../contexts/ProjectContext';
import type { StoryboardScene, ProjectAsset } from '../types';
import { LoaderIcon, SparklesIcon, ClapperboardIcon, ArrowLeftIcon, SaveIcon, PaletteIcon } from './icons';

interface StoryboardGeneratorProps {
    storyText: string;
    onBack: () => void;
}

type CharacterAssignments = Record<number, Record<string, string>>; // { sceneIndex: { characterName: characterId } }

export const StoryboardGenerator: React.FC<StoryboardGeneratorProps> = ({ storyText, onBack }) => {
    const { activeProject, addAsset } = useProjects();
    
    const [scenes, setScenes] = useState<StoryboardScene[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [assignments, setAssignments] = useState<CharacterAssignments>({});
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<(string | null)[]>([]);
    
    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const generatedScenes = await generateStoryboardPrompts(storyText);
                setScenes(generatedScenes);
                setGeneratedImages(new Array(generatedScenes.length).fill(null));
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
    
    const handleGenerateStoryboard = async () => {
        setIsGeneratingImages(true);
        setError(null);
        
        const style = activeProject?.stylePalette.find(s => s.id === selectedStyleId);

        const imagePromises = scenes.map((scene, index) => {
            const assignedCharacterImages = scene.characters_mentioned
                .map(name => {
                    const characterId = assignments[index]?.[name];
                    if (!characterId) return null;
                    const character = activeProject?.characterSheet.find(c => c.id === characterId);
                    return character ? character.imageB64 : null;
                })
                .filter((img): img is string => !!img);
            
            return generateStoryImage(scene.image_prompt, assignedCharacterImages, style?.imageB64)
                .then(imageB64 => {
                    setGeneratedImages(prev => {
                        const newImages = [...prev];
                        newImages[index] = imageB64;
                        return newImages;
                    });
                    return imageB64;
                })
                .catch(err => {
                    console.error(`Failed to generate image for scene ${index + 1}:`, err);
                    setError(`Failed to generate image for scene ${index + 1}.`);
                    return null;
                });
        });

        await Promise.all(imagePromises);
        setIsGeneratingImages(false);
    };

    const handleSaveToProject = () => {
        if (!activeProject) return;

        generatedImages.forEach((imageB64, index) => {
            if (imageB64) {
                const scene = scenes[index];
                const newAsset: ProjectAsset = {
                    id: `${Date.now()}_${index}`,
                    type: 'image',
                    name: `Storyboard Scene ${index + 1}`,
                    data: imageB64,
                    prompt: scene.image_prompt,
                };
                addAsset(newAsset);
            }
        });
        onBack();
    };

    const allCharactersAssigned = scenes.every((scene, index) => 
        scene.characters_mentioned.every(name => assignments[index]?.[name])
    );

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
                <div className="w-32"></div>
            </header>

            {isLoading && <div className="text-center"><LoaderIcon className="w-12 h-12 mx-auto" /><p>Gemini is analyzing your story...</p></div>}
            {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>}
            
            {!isLoading && !error && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {scenes.map((scene, index) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-3">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Scene {index + 1}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{scene.scene_description}"</p>
                                    {scene.characters_mentioned.length > 0 ? (
                                        <div className="space-y-2">
                                            {scene.characters_mentioned.map(name => (
                                                <div key={name}>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assign "{name}":</label>
                                                    <select
                                                        onChange={(e) => handleAssignmentChange(index, name, e.target.value)}
                                                        value={assignments[index]?.[name] || ''}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-600 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    >
                                                        <option value="" disabled>Select a character...</option>
                                                        {activeProject?.characterSheet.map(char => (
                                                            <option key={char.id} value={char.id}>{char.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-slate-500 dark:text-slate-400">No characters mentioned.</p>}
                                </div>
                            ))}
                        </div>
                        {activeProject?.stylePalette && activeProject.stylePalette.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center"><PaletteIcon className="w-5 h-5 mr-2 text-teal-500"/>Choose a Visual Style</h3>
                                <div className="flex space-x-3 overflow-x-auto pb-2">
                                    {activeProject.stylePalette.map(style => (
                                        <button key={style.id} onClick={() => setSelectedStyleId(style.id)} className={`flex-shrink-0 p-1.5 rounded-lg border-2 transition ${selectedStyleId === style.id ? 'border-teal-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-500'}`}>
                                            <img src={`data:image/png;base64,${style.imageB64}`} alt={style.name} title={style.name} className="w-20 h-20 object-cover rounded-md" />
                                            <p className="text-xs font-semibold mt-1 truncate w-20">{style.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleGenerateStoryboard}
                            disabled={isGeneratingImages || !allCharactersAssigned}
                            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center space-x-2 shadow-lg mx-auto"
                        >
                            {isGeneratingImages ? <><LoaderIcon className="h-5 w-5" /><span>Generating Images...</span></> : <><SparklesIcon className="h-5 w-5" /><span>Generate Storyboard</span></>}
                        </button>
                         {!allCharactersAssigned && <p className="text-xs text-slate-500 mt-2">Please assign all mentioned characters to continue.</p>}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                         <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Generated Storyboard</h2>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {generatedImages.map((imgB64, index) => (
                                <div key={index} className="bg-slate-100 dark:bg-slate-700 rounded-lg aspect-video flex items-center justify-center p-2">
                                    {imgB64 ? (
                                        <img src={`data:image/png;base64,${imgB64}`} alt={`Scene ${index + 1}`} className="w-full h-full object-contain rounded-md" />
                                    ) : (
                                        <div className="text-slate-400 dark:text-slate-500 text-center">
                                            {isGeneratingImages && scenes[index] ? <LoaderIcon className="w-8 h-8 mx-auto" /> : <ClapperboardIcon className="w-10 h-10 mx-auto" />}
                                            <p className="text-sm mt-1">Scene {index + 1}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {generatedImages.some(img => img !== null) && !isGeneratingImages && (
                             <button
                                onClick={handleSaveToProject}
                                className="mt-6 bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg mx-auto"
                            >
                                <SaveIcon className="h-5 w-5" />
                                <span>Save All Images to Project</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};