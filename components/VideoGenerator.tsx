import React, { useState, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon } from './icons';

export const VideoGenerator: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<{b64: string, file: File} | null>(null);
    const [prompt, setPrompt] = useState('A neon hologram of a cat driving at top speed');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isKeySelected, setIsKeySelected] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsKeySelected(hasKey);
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setIsKeySelected(true);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setVideoUrl(null);
            setError(null);
            const b64 = await fileToBase64(file);
            setSourceImage({ b64, file });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceImage || !prompt) {
            setError("Please upload an image and provide a prompt.");
            return;
        }
        if (!isKeySelected) {
            setError("Please select an API key to generate videos.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        
        try {
            const url = await generateVideo(
                sourceImage.b64, 
                sourceImage.file.type, 
                prompt, 
                aspectRatio,
                (message) => setLoadingMessage(message)
            );
            setVideoUrl(url);
        } catch (err) {
            if (err instanceof Error && err.message.includes("re-select your API key")) {
                setIsKeySelected(false);
            }
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    if (!isKeySelected) {
        return (
             <div className="text-center max-w-lg mx-auto bg-yellow-50 p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-yellow-900 mb-4">API Key Required for Video Generation</h2>
                <p className="text-yellow-800 mb-6">The Veo video generation model requires you to select your own API key. This ensures you are aware of the associated billing.</p>
                <button
                    onClick={handleSelectKey}
                    className="bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors shadow-md hover:shadow-lg"
                >
                    Select API Key
                </button>
                 <p className="mt-4 text-xs text-slate-500">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">billing documentation</a>.</p>
             </div>
        );
    }

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    Photo to Video Magic
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                   Bring your photos to life with the power of Veo.
                </p>
            </header>

            <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl mb-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 mb-1">Starting Image</label>
                        <input
                            id="imageUpload"
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={handleFileChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">Video Prompt</label>
                        <input
                            id="prompt"
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A cinematic shot of this car driving..."
                            className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            disabled={isLoading || !sourceImage}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
                        <div className="flex space-x-2 rounded-lg bg-slate-100 p-1">
                            <label className="flex-1">
                                <input type="radio" name="aspectRatio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="sr-only" />
                                <div className={`text-center p-2 rounded-md cursor-pointer transition-colors text-sm font-semibold ${aspectRatio === '16:9' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>Landscape (16:9)</div>
                            </label>
                            <label className="flex-1">
                                <input type="radio" name="aspectRatio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} className="sr-only" />
                                <div className={`text-center p-2 rounded-md cursor-pointer transition-colors text-sm font-semibold ${aspectRatio === '9:16' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>Portrait (9:16)</div>
                            </label>
                        </div>
                    </div>
                     <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-400/40"
                        disabled={isLoading || !sourceImage || !prompt}
                        >
                        {isLoading ? (
                            <>
                                <LoaderIcon className="h-5 w-5" />
                                <span>Generating Video...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="h-5 w-5" />
                                <span>Generate Video</span>
                            </>
                        )}
                    </button>
                </form>
                {error && <p className="mt-4 text-center text-red-700 bg-red-100 p-3 rounded-lg">{error}</p>}
            </div>

            {isLoading && (
                 <div className="text-center max-w-2xl mx-auto">
                     <div className="relative pt-[56.25%] bg-slate-100 rounded-xl flex items-center justify-center animate-pulse w-full">
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4">
                             <LoaderIcon className="w-12 h-12" />
                             <p className="mt-4 font-semibold">{loadingMessage}</p>
                         </div>
                     </div>
                 </div>
            )}

            {videoUrl && !isLoading && (
                 <div className="text-center max-w-2xl mx-auto">
                    <h3 className="font-bold text-2xl mb-4 text-slate-700">Your Video is Ready!</h3>
                    <video src={videoUrl} controls autoPlay loop className="w-full rounded-xl shadow-2xl" />
                 </div>
            )}
        </>
    );
};