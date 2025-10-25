import React, { useState, useEffect } from 'react';
import { editImage, convertImageToLineArt } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, UndoIcon, RedoIcon, ImageIcon, SaveIcon, FolderOpenIcon, CheckIcon, XIcon, MaskIcon, VideoIcon, BrushIcon } from './icons';
import { MaskingCanvas } from './MaskingCanvas';

const LOCAL_STORAGE_KEY = 'imageEditorSession';

interface ImageEditorProps {
    onSendToVideoGenerator: (imageData: { b64: string; mimeType: string; }) => void;
    onConvertToColoringPage: (newImageB64: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ onSendToVideoGenerator, onConvertToColoringPage }) => {
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [previewImageB64, setPreviewImageB64] = useState<string | null>(null);
    
    const [hasSavedSession, setHasSavedSession] = useState(false);
    const [prompt, setPrompt] = useState('Add a party hat to the main subject');
    const [isLoading, setIsLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isMasking, setIsMasking] = useState(false);
    const [activeMaskB64, setActiveMaskB64] = useState<string | null>(null);

    useEffect(() => {
        if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
            setHasSavedSession(true);
        }
    }, []);

    const currentImageB64 = historyIndex >= 0 ? history[historyIndex] : null;
    const imageToDisplay = previewImageB64 || currentImageB64;
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasImage = history.length > 0;

    const clearActiveEdits = () => {
        setPreviewImageB64(null);
        setActiveMaskB64(null);
        setError(null);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            clearActiveEdits();
            setPrompt('Add a party hat to the main subject');
            const b64 = await fileToBase64(file);
            setMimeType(file.type);
            setHistory([b64]);
            setHistoryIndex(0);
        }
    };

    const generatePreview = async (editPrompt: string) => {
        if (!currentImageB64 || !editPrompt || isLoading || !mimeType) return;

        setIsLoading(true);
        setError(null);
        setPrompt(editPrompt);
        setPreviewImageB64(null);

        try {
            const editedB64 = await editImage(currentImageB64, mimeType, editPrompt, activeMaskB64);
            setPreviewImageB64(editedB64);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleManualPreview = (e: React.FormEvent) => {
        e.preventDefault();
        generatePreview(prompt);
    };

    const handleConfirmEdit = () => {
        if (!previewImageB64) return;
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, previewImageB64]);
        setHistoryIndex(newHistory.length);
        clearActiveEdits();
    };

    const handleDiscardPreview = () => {
        setPreviewImageB64(null);
    };

    const handleUndo = () => {
        clearActiveEdits();
        if (canUndo) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleRedo = () => {
        clearActiveEdits();
        if (canRedo) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleSave = () => {
        if (!hasImage || !mimeType) return;
        const sessionData = {
            mimeType: mimeType,
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
                if (sessionData.mimeType && sessionData.history && sessionData.historyIndex !== undefined) {
                    setMimeType(sessionData.mimeType);
                    setHistory(sessionData.history);
                    setHistoryIndex(sessionData.historyIndex);
                    clearActiveEdits();
                } else {
                     setError("Could not load session. The saved data is corrupted.");
                }
            } catch (e) {
                setError("Could not parse saved session data.");
            }
        }
    };

    const handleCreateColoringPage = async () => {
        if (!currentImageB64 || !mimeType || isConverting) return;
        setIsConverting(true);
        setError(null);
        try {
            const lineArtB64 = await convertImageToLineArt(currentImageB64, mimeType);
            onConvertToColoringPage(lineArtB64);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to convert image.');
        } finally {
            setIsConverting(false);
        }
    };

    const renderError = () => {
        if (!error) return null;

        let title = "An Unexpected Error Occurred";
        let suggestions: string[] = ["Please try again in a few moments.", "If the problem persists, try loading a saved session or starting with a new image."];
        const lowerCaseError = error.toLowerCase();

        if (lowerCaseError.includes('safety') || lowerCaseError.includes('blocked')) {
            title = "Prompt Blocked for Safety";
            suggestions = [
                "Try rephrasing your prompt to be more general.",
                "Avoid using words that could be considered sensitive or harmful.",
                "Ensure your mask selection is appropriate if you are using one."
            ];
        } else if (lowerCaseError.includes('network') || lowerCaseError.includes('fetch')) {
            title = "Network Connection Error";
            suggestions = [
                "Please check your internet connection.",
                "Try refreshing the page and uploading the image again."
            ];
        } else if (lowerCaseError.includes('quota') || lowerCaseError.includes('rate limit')) {
            title = "API Limit Reached";
            suggestions = [
                "You have exceeded your usage limit for the API.",
                "Please check your billing details on your Google AI Studio account.",
                "Wait for some time before trying again."
            ];
        } else if (lowerCaseError.includes('invalid argument')) {
            title = "Invalid Request";
            suggestions = [
                "The model could not understand the request.",
                "Try making your prompt clearer, simpler, or more descriptive."
            ];
        } else if (lowerCaseError.includes('overloaded') || lowerCaseError.includes('unavailable')) {
            title = "Model Unavailable";
            suggestions = [
                "The AI model is currently busy or under maintenance.",
                "Please wait a few moments before trying again."
            ];
        }
        
        return (
            <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg shadow-sm animate-fade-in" role="alert">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg">{title}</p>
                        <p className="mt-1 text-sm">{error}</p>
                        <div className="mt-3 pt-2 border-t border-red-200">
                           <p className="font-semibold text-sm">What you can do:</p>
                           <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                               {suggestions.map((s, i) => <li key={i}>{s}</li>)}
                           </ul>
                        </div>
                    </div>
                    <button onClick={() => setError(null)} className="-mt-1 -mr-1 p-1 rounded-full text-red-700 hover:bg-red-200 transition" aria-label="Dismiss error">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    };

    const QuickEffectButton: React.FC<{ children: React.ReactNode, effectPrompt: string }> = ({ children, effectPrompt }) => (
        <button
            type="button"
            onClick={() => generatePreview(effectPrompt)}
            disabled={isLoading || !hasImage || !!previewImageB64}
            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm disabled:bg-slate-50 dark:disabled:bg-slate-700/50 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );

    return (
        <>
            {isMasking && currentImageB64 && (
                <MaskingCanvas
                    baseImageB64={currentImageB64}
                    onClose={() => setIsMasking(false)}
                    onSave={(mask) => {
                        setActiveMaskB64(mask);
                        setIsMasking(false);
                    }}
                />
            )}
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    AI Image Editor
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Upload a photo and use simple text prompts to make magical edits.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Controls</h2>
                    <div>
                        <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1. Upload Image</label>
                        <input
                            id="imageUpload"
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={handleFileChange}
                            className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900 transition"
                            disabled={isLoading}
                        />
                    </div>
                    
                    {previewImageB64 ? (
                        <div className="space-y-4 text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <p className="font-semibold text-indigo-800 dark:text-indigo-200">Confirm or Discard Preview</p>
                            <div className="flex justify-center space-x-4">
                                <button onClick={handleConfirmEdit} className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition shadow-md">
                                    <CheckIcon className="h-5 w-5" />
                                    <span>Confirm Edit</span>
                                </button>
                                <button onClick={handleDiscardPreview} className="flex-1 flex items-center justify-center space-x-2 bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition shadow-md">
                                    <XIcon className="h-5 w-5" />
                                    <span>Discard</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <form onSubmit={handleManualPreview}>
                                <div>
                                    <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Describe Your Edit</label>
                                    <input
                                        id="prompt"
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="e.g., Make the sky look like a galaxy"
                                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                        disabled={isLoading || !hasImage}
                                    />
                                </div>
                            </form>
                             <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Optional: Apply Edit to a Specific Area</label>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsMasking(true)}
                                        disabled={isLoading || !hasImage}
                                        className="flex-1 flex items-center justify-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500"
                                    >
                                        <MaskIcon className="h-5 w-5" />
                                        <span>{activeMaskB64 ? 'Edit Mask' : 'Create Mask'}</span>
                                    </button>
                                    {activeMaskB64 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveMaskB64(null)}
                                            disabled={isLoading}
                                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                                            aria-label="Clear mask"
                                        >
                                            <XIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                                {activeMaskB64 && <p className="text-xs text-green-700 dark:text-green-400 text-center flex items-center justify-center space-x-1"><CheckIcon className="h-3 w-3" /><span>Mask applied. Edits will target the selected area.</span></p>}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => handleManualPreview(e as any)}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                                disabled={isLoading || !hasImage || !prompt}
                            >
                                {isLoading ? <><LoaderIcon className="h-5 w-5" /><span>Generating Preview...</span></> : <><SparklesIcon className="h-5 w-5" /><span>Preview Edit</span></>}
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Or Try a Quick Effect</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <QuickEffectButton effectPrompt={'Apply a vintage photo effect'}>Vintage</QuickEffectButton>
                            <QuickEffectButton effectPrompt={'Add a vibrant neon glow to the edges'}>Neon Glow</QuickEffectButton>
                            <QuickEffectButton effectPrompt={'Convert the image to a black and white pencil sketch'}>Sketch</QuickEffectButton>
                            <QuickEffectButton effectPrompt={'Pixelate the image, giving it a retro 8-bit look'}>Pixelate</QuickEffectButton>
                            <QuickEffectButton effectPrompt={'Convert the image into a pop art style, like Andy Warhol'}>Pop Art</QuickEffectButton>
                            <QuickEffectButton effectPrompt={'Transform the photo into a watercolor painting'}>Watercolor</QuickEffectButton>
                        </div>
                        <QuickEffectButton effectPrompt={'Remove the background'}>Remove Background</QuickEffectButton>
                    </div>
                    
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">3. History</label>
                        <div className="flex justify-center items-center space-x-2">
                            <button onClick={handleUndo} disabled={!canUndo || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition">
                                <UndoIcon className="h-5 w-5" />
                                <span>Undo</span>
                            </button>
                            <div className="w-28 text-center">
                                {hasImage && (
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                                        Step {historyIndex + 1} of {history.length}
                                    </span>
                                )}
                            </div>
                            <button onClick={handleRedo} disabled={!canRedo || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition">
                                <RedoIcon className="h-5 w-5" />
                                <span>Redo</span>
                            </button>
                        </div>

                        {hasImage && (
                            <div className="flex overflow-x-auto space-x-3 p-2 bg-slate-100 dark:bg-slate-900/70 rounded-lg">
                                {history.map((imgB64, index) => (
                                    <button
                                        key={index}
                                        onClick={() => { clearActiveEdits(); setHistoryIndex(index); }}
                                        disabled={!!previewImageB64}
                                        className={`flex-shrink-0 w-20 h-20 bg-white dark:bg-slate-700 p-1 rounded-md overflow-hidden focus:outline-none transition-all duration-200 ${
                                            historyIndex === index
                                                ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800'
                                                : 'ring-1 ring-slate-300 dark:ring-slate-600 hover:ring-indigo-400'
                                        } ${!!previewImageB64 ? 'cursor-not-allowed opacity-50' : ''}`}
                                        aria-label={`Go to step ${index + 1}`}
                                    >
                                        <img
                                            src={`data:image/png;base64,${imgB64}`}
                                            alt={`History step ${index + 1}`}
                                            className="w-full h-full object-cover rounded-sm"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <div className="border-t dark:border-slate-700 pt-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">Session & Actions</label>
                             <div className="flex justify-center space-x-4 mb-4">
                                <button onClick={handleSave} disabled={!hasImage || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition">
                                    <SaveIcon className="h-5 w-5" />
                                    <span>Save</span>
                                </button>
                                <button onClick={handleLoad} disabled={!hasSavedSession || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition">
                                    <FolderOpenIcon className="h-5 w-5" />
                                    <span>Load</span>
                                </button>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <button
                                    onClick={handleCreateColoringPage}
                                    disabled={!hasImage || isLoading || !!previewImageB64 || isConverting}
                                    className="w-full flex items-center justify-center space-x-2 bg-teal-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-teal-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md"
                                >
                                    {isConverting ? <><LoaderIcon className="h-5 w-5" /><span>Converting...</span></> : <><BrushIcon className="h-5 w-5" /><span>Create Coloring Page</span></>}
                                </button>
                                <button
                                    onClick={() => {
                                        if(currentImageB64 && mimeType) {
                                            onSendToVideoGenerator({ b64: currentImageB64, mimeType })
                                        }
                                    }}
                                    disabled={!hasImage || isLoading || !!previewImageB64}
                                    className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md"
                                >
                                    <VideoIcon className="h-5 w-5" />
                                    <span>Animate this Image</span>
                                </button>
                            </div>
                        </div>
                    </div>
                     {renderError()}
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl flex items-center justify-center">
                    {imageToDisplay ? (
                        <div className="relative w-full h-full">
                            <img src={`data:image/png;base64,${imageToDisplay}`} alt="Edited result" className="w-full h-full object-contain rounded-lg" />
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex flex-col items-center justify-center rounded-lg">
                                    <LoaderIcon className="w-12 h-12 text-indigo-500" />
                                    <p className="mt-2 font-semibold text-slate-600 dark:text-slate-300">Generating Preview...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
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