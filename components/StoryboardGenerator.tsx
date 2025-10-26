import React, { useState, useEffect, useCallback } from 'react';
import { generateStoryboardPrompts, generateStoryImage, generateVideo, extendVideo } from '../services/geminiService';
import { useProjects } from '../contexts/ProjectContext';
import type { StoryboardScene, ProjectAsset, StoryboardVideoClip } from '../types';
import { LoaderIcon, SparklesIcon, ClapperboardIcon, ArrowLeftIcon, SaveIcon, PaletteIcon, RefreshCwIcon, AlertTriangleIcon, VideoIcon } from './icons';

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
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<ImageGenerationStatus[]>([]);
    
    // State for video animation
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationProgress, setAnimationProgress] = useState('');
    const [videoClips, setVideoClips] = useState<StoryboardVideoClip[]>([]);
    
    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const generatedScenes = await generateStoryboardPrompts(storyText);
                setScenes(generatedScenes);
                setGeneratedImages(new Array(generatedScenes.length).fill(null).map(() => ({ status: 'pending', data: null })));
                setVideoClips(new Array(generatedScenes.length).fill(null).map((_, i) => ({ status: 'pending', sceneIndex: i })));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate storyboard prompts.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrompts();
    }, [storyText]);

    const handleAssignmentChange = (sceneIndex: number, characterName: string, characterId: string) => {
        setAssignments(prev => ({ ...prev, [sceneIndex]: { ...prev[sceneIndex], [characterName]: characterId } }));
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
            const assignedCharacterImages = scene.characters_mentioned.map(name => {
                const characterId = assignments[sceneIndex]?.[name];
                return activeProject?.characterSheet.find(c => c.id === characterId)?.imageB64 || null;
            }).filter((img): img is string => !!img);

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

    const handleGenerateAllImages = async () => {
        setIsGeneratingImages(true);
        setError(null);
        await Promise.all(scenes.map((_, i) => (generatedImages[i]?.status !== 'done' ? generateImageForScene(i) : Promise.resolve())));
        setIsGeneratingImages(false);
    };

    const handleAnimateStoryboard = async () => {
        setIsAnimating(true);
        setError(null);
        setAnimationProgress("Starting animation process...");
        let lastSuccessfulClip: StoryboardVideoClip | null = null;
    
        for (let i = 0; i < scenes.length; i++) {
            const sceneImage = generatedImages[i];
            if (sceneImage.status !== 'done' || !sceneImage.data) {
                setAnimationProgress(`Skipping scene ${i + 1} (no image).`);
                continue;
            }
            
            setVideoClips(prev => prev.map((clip, index) => index === i ? { ...clip, status: 'loading' } : clip));
    
            try {
                let result;
                if (!lastSuccessfulClip) { // First clip
                    setAnimationProgress(`Generating clip 1/${scenes.length}...`);
                    result = await generateVideo(sceneImage.data, 'image/png', scenes[i].image_prompt, '16:9', (msg) => setAnimationProgress(`Clip 1: ${msg}`));
                } else { // Subsequent clips
                    setAnimationProgress(`Extending with clip ${i + 1}/${scenes.length}...`);
                    result = await extendVideo(lastSuccessfulClip.videoObject, scenes[i].image_prompt, '16:9', (msg) => setAnimationProgress(`Clip ${i+1}: ${msg}`));
                }
                const newClip = { status: 'done' as const, url: result.videoUrl, videoObject: result.videoObject, sceneIndex: i };
                lastSuccessfulClip = newClip;
                setVideoClips(prev => prev.map((clip, index) => index === i ? newClip : clip));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown video error.';
                setVideoClips(prev => prev.map((clip, index) => index === i ? { status: 'error' as const, error: errorMessage, sceneIndex: i } : clip));
                setError(`Failed to generate video for Scene ${i + 1}.`);
                setIsAnimating(false);
                return; // Stop the process on first error
            }
        }
        setAnimationProgress("Animation complete!");
        setIsAnimating(false);
    };

    const handleSaveAssets = () => {
        if (!activeProject) return;
        generatedImages.forEach((img, i) => {
            if (img.status === 'done' && img.data) {
                addAsset({ id: `${Date.now()}_img_${i}`, type: 'image', name: `Storyboard Scene ${i+1}`, data: img.data, prompt: scenes[i].image_prompt });
            }
        });
        const finalVideo = videoClips.findLast(c => c.status === 'done');
        if (finalVideo && finalVideo.url) {
            addAsset({ id: `${Date.now()}_vid`, type: 'video', name: `Storyboard Animation`, data: finalVideo.url, prompt: "Animated from storyboard" });
        }
        onBack();
    };

    const allCharactersAssigned = scenes.every((s, i) => s.characters_mentioned.every(name => assignments[i]?.[name]));
    const allImagesGenerated = generatedImages.every(img => img.status === 'done');
    const hasAnyAssetsToSave = generatedImages.some(img => img.status === 'done') || videoClips.some(c => c.status === 'done');

    return (
         <>
            <header className="flex items-center justify-between mb-10 md:mb-12">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" /><span>Back to Project</span>
                </button>
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Story to Storyboard</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Assign characters, choose a style, and bring your story to life.</p>
                </div>
                {hasAnyAssetsToSave && !isGeneratingImages && !isAnimating ? (
                    <button onClick={handleSaveAssets} className="flex items-center space-x-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition shadow-md"><SaveIcon className="h-5 w-5" /><span>Save Assets</span></button>
                ) : <div className="w-36"></div> }
            </header>

            {isLoading && <div className="text-center"><LoaderIcon className="w-12 h-12 mx-auto" /><p>Gemini is analyzing your story...</p></div>}
            {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>}
            
            {!isLoading && !error && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                           <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">1. Configuration</h2>
                                {activeProject?.stylePalette && activeProject.stylePalette.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center"><PaletteIcon className="w-5 h-5 mr-2 text-teal-500"/>Choose a Visual Style</h3>
                                        <div className="flex space-x-3 overflow-x-auto pb-2">{activeProject.stylePalette.map(style => (<button key={style.id} onClick={() => setSelectedStyleId(prev => prev === style.id ? '' : style.id)} className={`flex-shrink-0 p-1.5 rounded-lg border-2 transition ${selectedStyleId === style.id ? 'border-teal-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-500'}`}><img src={`data:image/png;base64,${style.imageB64}`} alt={style.name} title={style.name} className="w-20 h-20 object-cover rounded-md" /><p className="text-xs font-semibold mt-1 truncate w-20">{style.name}</p></button>))}</div>
                                    </div>
                                )}
                               <div className="text-center">
                                    <button onClick={handleGenerateAllImages} disabled={isGeneratingImages || isAnimating || !allCharactersAssigned} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center space-x-2 shadow-lg mx-auto"><SparklesIcon className="h-5 w-5" /><span>Generate All Scene Images</span></button>
                                    {!allCharactersAssigned && <p className="text-xs text-slate-500 mt-2">Please assign all characters to enable generation.</p>}
                               </div>
                           </div>
                           <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                               <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">2. Create Video</h2>
                               <button onClick={handleAnimateStoryboard} disabled={!allImagesGenerated || isAnimating || isGeneratingImages} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center space-x-2 shadow-lg mx-auto"><VideoIcon className="h-5 w-5" /><span>Animate Storyboard</span></button>
                               {!allImagesGenerated && <p className="text-xs text-slate-500 mt-2">Generate all scene images first to enable animation.</p>}
                                {isAnimating && <p className="text-sm text-slate-600 dark:text-slate-300 mt-4"><LoaderIcon className="inline w-4 h-4 mr-2 animate-spin"/>{animationProgress}</p>}
                           </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">3. Scenes & Assets</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {scenes.map((scene, index) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-3 flex flex-col">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Scene {index + 1}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{scene.scene_description}"</p>
                                    <div className="flex-grow space-y-2">
                                        <textarea value={scene.image_prompt} onChange={(e) => handlePromptChange(index, e.target.value)} rows={3} className="w-full text-xs p-2 rounded-md bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500" />
                                        {scene.characters_mentioned.map(name => (<div key={name} className="space-y-1"><label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Assign "{name}":</label><select onChange={(e) => handleAssignmentChange(index, name, e.target.value)} value={assignments[index]?.[name] || ''} className="w-full px-2 py-1 bg-white dark:bg-slate-600 rounded-md text-xs"><option value="" disabled>Select character...</option>{activeProject?.characterSheet.map(char => (<option key={char.id} value={char.id}>{char.name}</option>))}</select></div>))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="bg-slate-200 dark:bg-slate-800 rounded-lg aspect-video flex items-center justify-center p-1 relative group">
                                            {generatedImages[index]?.status === 'loading' ? <LoaderIcon className="w-8 h-8 text-slate-400" /> : generatedImages[index]?.status === 'done' ? <img src={`data:image/png;base64,${generatedImages[index].data}`} alt={`Scene ${index + 1}`} className="w-full h-full object-contain" /> : generatedImages[index]?.status === 'error' ? <div className="text-center text-red-500 p-1"><AlertTriangleIcon className="w-6 h-6 mx-auto" /><p className="text-xs mt-1" title={generatedImages[index].error}>Error</p></div> : <ClapperboardIcon className="w-8 h-8 text-slate-400" />}
                                            <button onClick={() => generateImageForScene(index)} disabled={isGeneratingImages || isAnimating} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><RefreshCwIcon className="w-6 h-6 text-white" /></button>
                                        </div>
                                        <div className="bg-slate-200 dark:bg-slate-800 rounded-lg aspect-video flex items-center justify-center p-1">
                                            {videoClips[index]?.status === 'loading' ? <LoaderIcon className="w-8 h-8 text-slate-400" /> : videoClips[index]?.status === 'done' ? <video src={videoClips[index].url} className="w-full h-full object-contain" controls loop /> : videoClips[index]?.status === 'error' ? <div className="text-center text-red-500 p-1"><AlertTriangleIcon className="w-6 h-6 mx-auto" /><p className="text-xs mt-1" title={videoClips[index].error}>Error</p></div> : <VideoIcon className="w-8 h-8 text-slate-400" />}
                                        </div>
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