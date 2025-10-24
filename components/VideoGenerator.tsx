import React, { useState, useEffect, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, ImageIcon, XIcon } from './icons';

// Add a declaration for the aistudio object on the window
declare global {
    interface Window {
        aistudio?: {
            hasSelectedApiKey: () => Promise<boolean>;
            openSelectKey: () => Promise<void>;
        };
    }
}

interface VideoGeneratorProps {
    initialImage?: { b64: string; file: File } | null;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ initialImage }) => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('A cinematic, dramatic shot of a cat looking out a window at a rainy city.');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);

    const checkApiKey = async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        } else {
            // If aistudio is not available, assume we can proceed for local dev.
            // In a real environment, this might be an error state.
            setApiKeySelected(true);
        }
    };

    useEffect(() => {
        checkApiKey();
    }, []);

    useEffect(() => {
        if (initialImage) {
            setFile(initialImage.file);
            const dataUrl = `data:${initialImage.file.type};base64,${initialImage.b64}`;
            setPreviewUrl(dataUrl);
            setVideoUrl(null);
            setError(null);
        }
    }, [initialImage]);
    
    useEffect(() => {
        // Clean up object URL when component unmounts or videoUrl changes
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [previewUrl, videoUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setVideoUrl(null);
            setError(null);
            
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleApiKeySelect = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                // Assume success and optimistically update UI
                setApiKeySelected(true);
                setError(null); // Clear previous key-related errors
            } catch (e) {
                console.error("Error opening API key selection:", e);
                setError("Could not open the API key selection dialog.");
            }
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || isLoading) return;

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setProgressMessage('Preparing to generate video...');

        try {
            const base64Data = await fileToBase64(file);
            const resultUrl = await generateVideo(
                base64Data,
                file.type,
                prompt,
                aspectRatio,
                (message) => setProgressMessage(message)
            );
            setVideoUrl(resultUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            // Specific check for API key error from geminiService
            if (errorMessage.toLowerCase().includes('re-select your api key')) {
                setApiKeySelected(false);
            }
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };
    
    const renderContent = () => {
        if (!apiKeySelected) {
            return (
                <div className="text-center p-8 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-amber-800 mb-2">API Key Required for Video Generation</h3>
                    <p className="text-amber-700 mb-4">
                        The Veo model requires a project-linked API key to function. Please select your API key to continue.
                        For more information on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">Google's documentation</a>.
                    </p>
                    <button onClick={handleApiKeySelect} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition shadow-md">
                        Select API Key
                    </button>
                    {error && <p className="mt-4 text-red-600">{error}</p>}
                </div>
            );
        }

        return (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Video Details</h2>
                        <div>
                            <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 mb-1">1. Starting Image</label>
                            <input
                                id="imageUpload"
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleFileChange}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">2. Animation Prompt</label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                placeholder="e.g., A cinematic shot of a car driving through a neon-lit city at night"
                                className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">3. Aspect Ratio</label>
                            <div className="flex space-x-4">
                                {(['16:9', '9:16'] as const).map(ratio => (
                                    <label key={ratio} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="aspectRatio"
                                            value={ratio}
                                            checked={aspectRatio === ratio}
                                            onChange={() => setAspectRatio(ratio)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                            disabled={isLoading}
                                        />
                                        <span className="text-sm text-slate-600">{ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                            disabled={isLoading || !file}
                        >
                            {isLoading ? (
                                <><LoaderIcon className="h-5 w-5" /><span>Generating Video...</span></>
                            ) : (
                                <><SparklesIcon className="h-5 w-5" /><span>Generate Video</span></>
                            )}
                        </button>
                    </form>
                </div>
                 <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                    {isLoading ? (
                        <div className="text-center text-slate-500">
                             <LoaderIcon className="w-12 h-12 mx-auto mb-4" />
                             <p className="font-semibold">{progressMessage}</p>
                             <p className="text-sm mt-2 max-w-xs">Video generation can take several minutes. Please be patient.</p>
                        </div>
                    ) : error ? (
                        <div className="w-full p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg shadow-sm animate-fade-in" role="alert">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">Generation Failed</p>
                                    <p className="mt-1 text-sm">{error}</p>
                                </div>
                                <button onClick={() => setError(null)} className="-mt-1 -mr-1 p-1 rounded-full text-red-700 hover:bg-red-200 transition" aria-label="Dismiss error">
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ) : videoUrl ? (
                         <div className="w-full text-center">
                            <h3 className="text-2xl font-bold text-slate-800 mb-4">Video Generated!</h3>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full rounded-lg shadow-md"
                            />
                            <a
                                href={videoUrl}
                                download="gemini-generated-video.mp4"
                                className="inline-block mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition"
                            >
                                Download Video
                            </a>
                        </div>
                    ) : previewUrl ? (
                        <div className="w-full text-center">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Image Preview</h3>
                            <img src={previewUrl} alt="Preview" className="max-w-full max-h-80 object-contain rounded-lg shadow-md" />
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 flex flex-col items-center">
                             <ImageIcon className="w-16 h-16 mb-4" />
                            <p className="text-lg font-semibold">Upload an image to animate</p>
                            <p className="text-sm">Your generated video will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    AI Video Generator
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                    Bring your images to life. Turn a single photo into a dynamic video with a simple text prompt.
                </p>
            </header>
            {renderContent()}
        </>
    );
};
