import React, { useState, useEffect } from 'react';
import { generateVideo, extendVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, ImageIcon, XIcon, TrashIcon } from './icons';

interface VideoClip {
  url: string;
  videoObject: any;
  prompt: string;
}

interface VideoGeneratorProps {
    initialImage?: { b64: string; file: File } | null;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ initialImage }) => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
    const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('A cinematic, dramatic shot of a cat looking out a window at a rainy city.');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [extensionPrompt, setExtensionPrompt] = useState('Something unexpected happens.');

    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
    const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
    
    const latestClip = videoClips.length > 0 ? videoClips[videoClips.length - 1] : null;
    const displayedClipIndex = selectedClipIndex ?? (videoClips.length > 0 ? videoClips.length - 1 : null);
    const displayedClip = displayedClipIndex !== null ? videoClips[displayedClipIndex] : null;

    const checkApiKey = async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        } else {
            // If the aistudio object doesn't exist, assume we're not in a context where it's needed.
            setApiKeySelected(true);
        }
    };

    useEffect(() => {
        checkApiKey();
    }, []);

    const handleStartOver = () => {
        // Revoke URLs to prevent memory leaks
        videoClips.forEach(clip => URL.revokeObjectURL(clip.url));
        if (sourceImageUrl && sourceImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(sourceImageUrl);
        }

        setSourceImageFile(null);
        setSourceImageUrl(null);
        setVideoClips([]);
        setSelectedClipIndex(null);
        setError(null);
        setProgressMessage('');
        setIsLoading(false);
        setIsExtending(false);
    };

    useEffect(() => {
        if (initialImage) {
            handleStartOver(); // Clear previous state
            setSourceImageFile(initialImage.file);
            const dataUrl = `data:${initialImage.file.type};base64,${initialImage.b64}`;
            setSourceImageUrl(dataUrl);
        }
    }, [initialImage]);
    
    useEffect(() => {
        return () => {
            handleStartOver(); // Cleanup on unmount
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleStartOver(); // Clear previous state
            setSourceImageFile(selectedFile);
            setSourceImageUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleApiKeySelect = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                setApiKeySelected(true);
                setError(null);
            } catch (e) {
                console.error("Error opening API key selection:", e);
                setError("Could not open the API key selection dialog.");
            }
        }
    };
    
    const handleGenerateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceImageFile || isLoading) return;

        setIsLoading(true);
        setError(null);
        setVideoClips([]);
        setProgressMessage('Preparing to generate video...');

        try {
            const base64Data = await fileToBase64(sourceImageFile);
            const { videoUrl, videoObject } = await generateVideo(
                base64Data,
                sourceImageFile.type,
                prompt,
                aspectRatio,
                (message) => setProgressMessage(message)
            );
            setVideoClips([{ url: videoUrl, videoObject, prompt }]);
            setSelectedClipIndex(0);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            if (errorMessage.toLowerCase().includes('re-select your api key')) {
                setApiKeySelected(false);
            }
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };

    const handleExtendVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!latestClip || isExtending || isLoading) return;

        setIsExtending(true);
        setError(null);
        setProgressMessage('Preparing to extend video...');

        try {
            const { videoUrl, videoObject } = await extendVideo(
                latestClip.videoObject,
                extensionPrompt,
                aspectRatio,
                (message) => setProgressMessage(message)
            );
            const newClip = { url: videoUrl, videoObject, prompt: extensionPrompt };
            setVideoClips(prev => {
                const newClips = [...prev, newClip];
                setSelectedClipIndex(newClips.length - 1);
                return newClips;
            });
            setExtensionPrompt('');
        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            if (errorMessage.toLowerCase().includes('re-select your api key')) {
                setApiKeySelected(false);
            }
        } finally {
            setIsExtending(false);
            setProgressMessage('');
        }
    };

    const renderApiKeyScreen = () => (
        <div className="text-center p-8 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-amber-800 mb-2">API Key Required</h3>
            <p className="text-amber-700 mb-4">
                Video generation requires a project-linked API key. Please select your key.
                Info on billing: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">Google's docs</a>.
            </p>
            <button onClick={handleApiKeySelect} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition shadow-md">
                Select API Key
            </button>
            {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
    );
    
    return (
        <>
            <style>{`.input-style { background-color: #f1f5f9; border-radius: 0.5rem; padding: 0.5rem 1rem; width: 100%; border: 1px solid #e2e8f0; } .input-style:focus { outline: none; ring: 2px; ring-color: #6366f1; } .dark .input-style { background-color: #334155; border-color: #475569; color: #e2e8f0; }`}</style>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">AI Video Generator</h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Bring images to life. Turn a photo into a dynamic video, then extend it with new prompts to create a longer story.
                </p>
            </header>
            
            {!apiKeySelected ? renderApiKeyScreen() : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Left Column: Controls */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {videoClips.length > 0 ? 'Video Controls' : '1. Generate Video'}
                            </h2>
                            {videoClips.length > 0 && (
                                <button onClick={handleStartOver} className="flex items-center space-x-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                                    <TrashIcon className="w-4 h-4" />
                                    <span>Start Over</span>
                                </button>
                            )}
                        </div>
                        
                        {videoClips.length === 0 ? (
                            <form onSubmit={handleGenerateVideo} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Starting Image</label>
                                    <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900 transition" disabled={isLoading} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Animation Prompt</label>
                                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full input-style" disabled={isLoading} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Aspect Ratio</label>
                                    <div className="flex space-x-4">
                                        {(['16:9', '9:16'] as const).map(ratio => (
                                            <label key={ratio} className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={() => setAspectRatio(ratio)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" disabled={isLoading}/><span>{ratio === '16:9' ? 'Landscape' : 'Portrait'}</span></label>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center space-x-2 shadow-lg" disabled={isLoading || !sourceImageFile}>
                                    {isLoading ? (<><LoaderIcon className="h-5 w-5" /><span>Generating...</span></>) : (<><SparklesIcon className="h-5 w-5" /><span>Generate Video</span></>)}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">2. Extend Your Video</h3>
                                <form onSubmit={handleExtendVideo} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Next Scene Prompt</label>
                                        <textarea value={extensionPrompt} onChange={(e) => setExtensionPrompt(e.target.value)} placeholder="e.g., The camera pans to reveal..." rows={3} className="w-full input-style" disabled={isExtending || isLoading} required />
                                    </div>
                                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center space-x-2 shadow-lg" disabled={isExtending || isLoading}>
                                        {isExtending ? (<><LoaderIcon className="h-5 w-5" /><span>Extending...</span></>) : (<><SparklesIcon className="h-5 w-5" /><span>Generate Extension (7s)</span></>)}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                    
                    {/* Right Column: Preview/Result */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[500px]">
                        {(isLoading || isExtending) ? (
                            <div className="text-center text-slate-500 dark:text-slate-400"><LoaderIcon className="w-12 h-12 mx-auto mb-4" /><p className="font-semibold">{progressMessage}</p><p className="text-sm mt-2 max-w-xs">Video generation can take several minutes.</p></div>
                        ) : error ? (
                            <div className="w-full p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg"><div className="flex justify-between items-start"><div><p className="font-bold text-lg">Error</p><p className="mt-1 text-sm">{error}</p></div><button onClick={() => setError(null)} className="-mt-1 -mr-1 p-1 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5" /></button></div></div>
                        ) : displayedClip && displayedClipIndex !== null ? (
                             <div className="w-full text-center">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                                    {`Clip ${displayedClipIndex + 1} of ${videoClips.length}`}
                                </h3>
                                <video key={displayedClip.url} src={displayedClip.url} controls autoPlay loop className="w-full rounded-lg shadow-md bg-black" />
                                <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 italic">Prompt: "{displayedClip.prompt}"</p>
                                
                                <a href={displayedClip.url} download={`gemini-clip-${displayedClipIndex + 1}.mp4`} className="inline-block mt-4 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition">Download Clip {displayedClipIndex + 1}</a>
                               
                                {videoClips.length > 1 && (
                                    <div className="mt-6">
                                        <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 text-left mb-2">Video Sequence</h4>
                                        <div className="flex space-x-2 overflow-x-auto p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                            {videoClips.map((clip, index) => (
                                                <button 
                                                    key={index}
                                                    onClick={() => setSelectedClipIndex(index)}
                                                    className={`flex-shrink-0 text-center w-36 p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selectedClipIndex === index ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-transparent hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                                >
                                                    <video src={clip.url} className="w-full h-20 object-cover rounded-md bg-black pointer-events-none" preload="metadata" muted playsInline></video>
                                                    <p className="text-xs mt-1 text-slate-600 dark:text-slate-400 truncate px-1" title={clip.prompt}>Clip {index + 1}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : sourceImageUrl ? (
                            <div className="w-full text-center">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Starting Image Preview</h3>
                                <img src={sourceImageUrl} alt="Source for video" className="max-w-full max-h-96 object-contain rounded-lg shadow-md" />
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 dark:text-slate-500 flex flex-col items-center"><ImageIcon className="w-16 h-16 mb-4" /><p className="text-lg font-semibold">Upload an image to animate</p><p className="text-sm">Your generated video will appear here.</p></div>
                        )}
                    </div>
                 </div>
            )}
        </>
    );
};