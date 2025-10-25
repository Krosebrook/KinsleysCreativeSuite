import React, { useState } from 'react';
import { generateSticker } from '../services/geminiService';
import { LoaderIcon, SparklesIcon, StickerIcon, ImageIcon } from './icons';

interface StickerMakerProps {
    onSendToEditor: (stickerB64: string) => void;
}

export const StickerMaker: React.FC<StickerMakerProps> = ({ onSendToEditor }) => {
    const [prompt, setPrompt] = useState('a cute cat wearing sunglasses');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stickerB64, setStickerB64] = useState<string | null>(null);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setStickerB64(null);

        try {
            const generatedSticker = await generateSticker(prompt);
            setStickerB64(generatedSticker);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during sticker generation.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    AI Sticker Maker
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Describe any sticker you can imagine, and Gemini will create it for you.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                         <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Sticker Details</h2>
                         <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Describe your sticker</label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A happy robot waving from its spaceship"
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                rows={3}
                                disabled={isLoading}
                            />
                        </div>
                        
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-400/40"
                            disabled={isLoading || !prompt}
                        >
                            {isLoading ? (
                                <><LoaderIcon className="h-5 w-5" /><span>Generating...</span></>
                            ) : (
                                <><SparklesIcon className="h-5 w-5" /><span>Generate Sticker</span></>
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                    {isLoading && (
                        <div className="text-center text-slate-500 dark:text-slate-400">
                             <LoaderIcon className="w-12 h-12 mx-auto mb-4" />
                             <p className="font-semibold">Gemini is creating your sticker...</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg m-auto">{error}</p>}
                    
                    {stickerB64 && !isLoading && (
                        <div className="text-center animate-fade-in">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Your Sticker is Ready!</h2>
                             <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg inline-block shadow-inner">
                                <img 
                                    src={`data:image/png;base64,${stickerB64}`} 
                                    alt="Generated Sticker" 
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            <button
                                onClick={() => onSendToEditor(stickerB64)}
                                className="w-full mt-6 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                            >
                                <ImageIcon className="h-5 w-5" />
                                <span>Use in Image Editor</span>
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && !stickerB64 && (
                        <div className="text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                            <StickerIcon className="w-16 h-16 mb-4" />
                            <p className="text-lg">Your generated sticker will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};