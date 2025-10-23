import React, { useState, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, UndoIcon, RedoIcon, ImageIcon, SaveIcon, FolderOpenIcon } from './icons';

const LOCAL_STORAGE_KEY = 'imageEditorSession';

export const ImageEditor: React.FC = () => {
    const [imageData, setImageData] = useState<{ b64: string; type: string } | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [hasSavedSession, setHasSavedSession] = useState(false);
    
    const [prompt, setPrompt] = useState('Add a party hat to the main subject');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
            setHasSavedSession(true);
        }
    }, []);

    const currentImageB64 = historyIndex >= 0 ? history[historyIndex] : null;
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setError(null);
            setPrompt('Add a party hat to the main subject');
            const b64 = await fileToBase64(file);
            setImageData({ b64, type: file.type });
            setHistory([b64]);
            setHistoryIndex(0);
        }
    };

    const applyEdit = async (editPrompt: string) => {
        if (!currentImageB64 || !editPrompt || isLoading || !imageData) return;

        setIsLoading(true);
        setError(null);
        setPrompt(editPrompt); // Update the input field to reflect the applied prompt

        try {
            const newHistory = history.slice(0, historyIndex + 1);
            const editedB64 = await editImage(currentImageB64, imageData.type, editPrompt);
            
            setHistory([...newHistory, editedB64]);
            setHistoryIndex(newHistory.length);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleManualEdit = (e: React.FormEvent) => {
        e.preventDefault();
        applyEdit(prompt);
    };

    const handleUndo = () => {
        if (canUndo) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleRedo = () => {
        if (canRedo) {
            setHistoryIndex(historyIndex + 1);
        }
    };

    const handleSave = () => {
        if (!imageData || history.length === 0) return;

        const sessionData = {
            imageData: imageData,
            history: history,
            historyIndex: historyIndex,
        };

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionData));
        setHasSavedSession(true);
        alert('Session saved!');
    };

    const handleLoad = () => {
        const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                if (sessionData.imageData && sessionData.history && sessionData.historyIndex !== undefined) {
                    setImageData(sessionData.imageData);
                    setHistory(sessionData.history);
                    setHistoryIndex(sessionData.historyIndex);
                    setError(null);
                } else {
                     setError("Could not load session. The saved data is corrupted.");
                }
            } catch (e) {
                setError("Could not parse saved session data.");
            }
        }
    };


    const QuickEffectButton: React.FC<{ onClick: () => void, disabled: boolean, children: React.ReactNode }> = ({ onClick, disabled, children }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full bg-slate-100 text-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200 transition text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    AI Image Editor
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                    Upload a photo and use simple text prompts to make magical edits.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-xl space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800">Controls</h2>
                    <div>
                        <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 mb-1">1. Upload Image</label>
                        <input
                            id="imageUpload"
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={handleFileChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <form onSubmit={handleManualEdit} className="space-y-4">
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">2. Describe Your Edit</label>
                            <input
                                id="prompt"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., Make the sky look like a galaxy"
                                className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                disabled={isLoading || !imageData}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                            disabled={isLoading || !imageData || !prompt}
                        >
                            {isLoading ? <><LoaderIcon className="h-5 w-5" /><span>Editing...</span></> : <><SparklesIcon className="h-5 w-5" /><span>Apply Edit</span></>}
                        </button>
                    </form>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 text-center">Or Try a Quick Effect</label>
                        <div className="grid grid-cols-2 gap-3">
                            <QuickEffectButton onClick={() => applyEdit('Apply a vintage photo effect')} disabled={isLoading || !imageData}>Vintage</QuickEffectButton>
                            <QuickEffectButton onClick={() => applyEdit('Add a vibrant neon glow to the edges')} disabled={isLoading || !imageData}>Neon Glow</QuickEffectButton>
                            <QuickEffectButton onClick={() => applyEdit('Convert the image to a black and white pencil sketch')} disabled={isLoading || !imageData}>Sketch</QuickEffectButton>
                            <QuickEffectButton onClick={() => applyEdit('Apply a warm sepia tone')} disabled={isLoading || !imageData}>Sepia Tone</QuickEffectButton>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 text-center">3. History & Session</label>
                        <div className="flex justify-center space-x-4">
                            <button onClick={handleUndo} disabled={!canUndo || isLoading} className="flex items-center space-x-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition">
                                <UndoIcon className="h-5 w-5" />
                                <span>Undo</span>
                            </button>
                            <button onClick={handleRedo} disabled={!canRedo || isLoading} className="flex items-center space-x-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition">
                                <RedoIcon className="h-5 w-5" />
                                <span>Redo</span>
                            </button>
                        </div>
                         <div className="flex justify-center space-x-4 mt-3">
                            <button onClick={handleSave} disabled={!imageData || isLoading} className="flex items-center space-x-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition">
                                <SaveIcon className="h-5 w-5" />
                                <span>Save</span>
                            </button>
                            <button onClick={handleLoad} disabled={!hasSavedSession || isLoading} className="flex items-center space-x-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition">
                                <FolderOpenIcon className="h-5 w-5" />
                                <span>Load</span>
                            </button>
                        </div>
                    </div>
                     {error && <p className="mt-2 text-center text-red-700 bg-red-100 p-3 rounded-lg">{error}</p>}
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center justify-center">
                    {currentImageB64 ? (
                        <div className="relative w-full h-full">
                            <img src={`data:image/png;base64,${currentImageB64}`} alt="Edited result" className="w-full h-full object-contain rounded-lg" />
                            {isLoading && (
                                <div className="absolute inset-0 bg-white bg-opacity-70 flex flex-col items-center justify-center rounded-lg">
                                    <LoaderIcon className="w-12 h-12 text-indigo-500" />
                                    <p className="mt-2 font-semibold text-slate-600">Applying your edit...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 flex flex-col items-center">
                             <ImageIcon className="w-16 h-16 mb-4" />
                            <p className="text-lg font-semibold">Upload an image to start editing</p>
                            <p className="text-sm">Your edited photo will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};