import React, { useState, useEffect } from 'react';
import { editImage, convertImageToLineArt } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, UndoIcon, RedoIcon, ImageIcon, SaveIcon, CheckIcon, XIcon, MaskIcon, VideoIcon, BrushIcon, ArrowLeftIcon } from './icons';
import { MaskingCanvas } from './MaskingCanvas';
import type { Project, ProjectAsset } from '../types';

interface ImageEditorProps {
    project: Project;
    onSaveAsset: (asset: ProjectAsset) => void;
    onBack: () => void;
    onSendToVideoGenerator: (imageData: { b64: string; mimeType: string; }) => void;
    onConvertToColoringPage: (newImageB64: string) => void;
    incomingStickerB64?: string | null;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ project, onSaveAsset, onBack, onSendToVideoGenerator, onConvertToColoringPage, incomingStickerB64 }) => {
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [previewImageB64, setPreviewImageB64] = useState<string | null>(null);
    
    const [prompt, setPrompt] = useState('Add a party hat to the main subject');
    const [isLoading, setIsLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isMasking, setIsMasking] = useState(false);
    const [activeMaskB64, setActiveMaskB64] = useState<string | null>(null);
    const [stickerToApply, setStickerToApply] = useState<string | null>(null);

    const currentImageB64 = historyIndex >= 0 ? history[historyIndex] : null;
    const imageToDisplay = previewImageB64 || currentImageB64;
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasImage = history.length > 0;
    
    useEffect(() => {
        if (incomingStickerB64) {
            if (!hasImage) {
                setError("Please upload a base image before adding a sticker.");
                return;
            }
            setStickerToApply(incomingStickerB64);
            setPrompt('Place the sticker on the main subject of the primary image.');
        }
    }, [incomingStickerB64, hasImage]);

    const clearActiveEdits = () => {
        setPreviewImageB64(null);
        setActiveMaskB64(null);
        setError(null);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            clearActiveEdits();
            setStickerToApply(null);
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
            const editedB64 = await editImage(currentImageB64, mimeType, editPrompt, activeMaskB64, stickerToApply);
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
        setStickerToApply(null);
    };

    const handleDiscardPreview = () => {
        setPreviewImageB64(null);
    };

    const handleUndo = () => {
        clearActiveEdits();
        setStickerToApply(null);
        if (canUndo) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleRedo = () => {
        clearActiveEdits();
        setStickerToApply(null);
        if (canRedo) {
            setHistoryIndex(historyIndex + 1); // Corrected redo logic
        }
    };

    const handleSaveToProject = () => {
        if (!currentImageB64) return;
        const assetName = prompt.length > 30 ? prompt.substring(0, 27) + "..." : prompt;
        const newAsset: ProjectAsset = {
            id: Date.now().toString(),
            type: 'image',
            name: `Image: ${assetName}`,
            data: currentImageB64,
            prompt: prompt,
        };
        onSaveAsset(newAsset);
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

    const QuickEffectButton: React.FC<{ children: React.ReactNode, effectPrompt: string }> = ({ children, effectPrompt }) => (
        <button
            type="button"
            onClick={() => generatePreview(effectPrompt)}
            disabled={isLoading || !hasImage || !!previewImageB64 || !!stickerToApply}
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
            <header className="flex items-center justify-between mb-10 md:mb-12">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Project</span>
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    AI Image Editor
                </h1>
                <div className="w-32"></div> {/* Spacer */}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Controls</h2>
                        <button onClick={handleSaveToProject} disabled={!hasImage || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md">
                            <SaveIcon className="h-5 w-5" />
                            <span>Save to Project</span>
                        </button>
                    </div>

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
                                {stickerToApply && (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Applying Sticker</p>
                                            <button onClick={() => setStickerToApply(null)} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">Clear</button>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <img src={`data:image/png;base64,${stickerToApply}`} alt="Sticker to apply" className="w-16 h-16 rounded-md bg-white p-1 shadow-sm" />
                                            <p className="text-xs text-slate-600 dark:text-slate-300">Update the prompt below to describe where to place this sticker on your image.</p>
                                        </div>
                                    </div>
                                )}
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
                                        disabled={isLoading || !hasImage || !!stickerToApply}
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
                        
                        <div className="border-t dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
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
                     {error && <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg shadow-sm"><p className="font-bold">Error</p><p>{error}</p></div>}
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
