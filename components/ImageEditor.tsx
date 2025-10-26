import React, { useState, useEffect } from 'react';
import { editImage, convertImageToLineArt } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
// FIX: Added 'PencilIcon' to the import list.
import { LoaderIcon, SparklesIcon, UndoIcon, RedoIcon, ImageIcon, SaveIcon, CheckIcon, XIcon, MaskIcon, VideoIcon, BrushIcon, ArrowLeftIcon, UserIcon, PaletteIcon, LayersIcon, TrashIcon, ExpandIcon, PencilIcon } from './icons';
import { MaskingCanvas } from './MaskingCanvas';
import type { ProjectAsset, Character, Layer } from '../types';
import { useProjects } from '../contexts/ProjectContext';
import { AddCharacterModal } from './modals/AddCharacterModal';
import { AddStyleModal } from './modals/AddStyleModal';

interface ImageEditorProps {
    onBack: () => void;
    onSendToVideoGenerator: (imageData: { b64: string; mimeType: string; }) => void;
    onConvertToColoringPage: (newImageB64: string) => void;
    incomingStickerB64?: string | null;
}

type EditMode = 'prompt' | 'mask' | 'expand';

export const ImageEditor: React.FC<ImageEditorProps> = ({ onBack, onSendToVideoGenerator, onConvertToColoringPage, incomingStickerB64 }) => {
    const { activeProject, addAsset, addCharacter, addStyle } = useProjects();
    
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [history, setHistory] = useState<Layer[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [previewImageB64, setPreviewImageB64] = useState<string | null>(null);
    
    const [prompt, setPrompt] = useState('Add a party hat to the main subject');
    const [isLoading, setIsLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editMode, setEditMode] = useState<EditMode>('prompt');
    const [activeMaskB64, setActiveMaskB64] = useState<string | null>(null);
    const [stickerToApply, setStickerToApply] = useState<string | null>(null);

    const [expandSize, setExpandSize] = useState(256);

    const [selectedCharacterB64, setSelectedCharacterB64] = useState<string | null>(null);
    const [selectedStyleB64, setSelectedStyleB64] = useState<string | null>(null);
    const [isAddCharacterModalOpen, setIsAddCharacterModalOpen] = useState(false);
    const [isAddStyleModalOpen, setIsAddStyleModalOpen] = useState(false);

    const currentLayer = history[historyIndex];
    const currentImageB64 = currentLayer?.imageB64;
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
            setSelectedCharacterB64(null);
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
            setSelectedCharacterB64(null);
            setSelectedStyleB64(null);
            setPrompt('Add a party hat to the main subject');
            const b64 = await fileToBase64(file);
            setMimeType(file.type);
            const baseLayer: Layer = {
                id: Date.now().toString(),
                name: 'Base Image',
                imageB64: b64,
            };
            setHistory([baseLayer]);
            setHistoryIndex(0);
        }
    };

    const generatePreview = async (editPrompt: string, baseImageB64: string, maskB64?: string | null) => {
        if (!baseImageB64 || !editPrompt || isLoading || !mimeType) return;

        setIsLoading(true);
        setError(null);
        setPrompt(editPrompt);
        setPreviewImageB64(null);

        try {
            const editedB64 = await editImage(baseImageB64, mimeType, editPrompt, maskB64, stickerToApply, selectedCharacterB64, selectedStyleB64);
            setPreviewImageB64(editedB64);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleManualPreview = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentImageB64) {
             generatePreview(prompt, currentImageB64, activeMaskB64);
        }
    };

    const handleConfirmEdit = () => {
        if (!previewImageB64) return;
        const newLayer: Layer = {
            id: Date.now().toString(),
            name: prompt,
            imageB64: previewImageB64,
        };
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, newLayer]);
        setHistoryIndex(newHistory.length);
        clearActiveEdits();
        setStickerToApply(null);
        setEditMode('prompt');
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
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleSelectLayer = (indexToSelect: number) => {
        if (previewImageB64) handleDiscardPreview();
        setHistoryIndex(indexToSelect);
    };
    
    const handleDeleteLayer = (indexToDelete: number) => {
        if (previewImageB64) handleDiscardPreview();
    
        if (indexToDelete === 0) {
            // Reset everything if the base layer is deleted
            setHistory([]);
            setHistoryIndex(-1);
            setMimeType(null);
        } else if (indexToDelete > 0) {
            // Remove the target layer and all subsequent layers
            const newHistory = history.slice(0, indexToDelete);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    };

    const handleSaveToProject = () => {
        if (!currentImageB64 || !currentLayer) return;
        const assetName = currentLayer.name.length > 30 ? currentLayer.name.substring(0, 27) + "..." : currentLayer.name;
        const newAsset: ProjectAsset = {
            id: Date.now().toString(),
            type: 'image',
            name: `Image: ${assetName}`,
            data: currentImageB64,
            prompt: currentLayer.name,
        };
        addAsset(newAsset);
        onBack();
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

    const handleSaveCharacter = (name: string) => {
        if (currentImageB64) {
            addCharacter({ name, imageB64: currentImageB64, prompt });
            setIsAddCharacterModalOpen(false);
        }
    };
    
    const handleSaveStyle = (name: string) => {
        if (currentImageB64) {
            addStyle({ name, imageB64: currentImageB64 });
            setIsAddStyleModalOpen(false);
        }
    };

    const handleSelectCharacter = (characterB64: string) => {
        setSelectedCharacterB64(prev => prev === characterB64 ? null : characterB64);
    };

    const handleSelectStyle = (styleB64: string) => {
        setSelectedStyleB64(prev => prev === styleB64 ? null : styleB64);
    };

    const handleExpandImage = () => {
        if (!currentImageB64) return;
        
        const img = new Image();
        img.onload = () => {
            const originalWidth = img.width;
            const originalHeight = img.height;
            const newWidth = originalWidth + expandSize * 2;
            const newHeight = originalHeight + expandSize * 2;
            
            // Create expanded image canvas
            const expandedCanvas = document.createElement('canvas');
            expandedCanvas.width = newWidth;
            expandedCanvas.height = newHeight;
            const expandedCtx = expandedCanvas.getContext('2d');
            expandedCtx?.drawImage(img, expandSize, expandSize);
            const expandedImageB64 = expandedCanvas.toDataURL('image/png').split(',')[1];
            
            // Create mask canvas
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = newWidth;
            maskCanvas.height = newHeight;
            const maskCtx = maskCanvas.getContext('2d');
            if (maskCtx) {
                maskCtx.fillStyle = 'white'; // Area to edit
                maskCtx.fillRect(0, 0, newWidth, newHeight);
                maskCtx.fillStyle = 'black'; // Area to keep
                maskCtx.fillRect(expandSize, expandSize, originalWidth, originalHeight);
            }
            const maskB64 = maskCanvas.toDataURL('image/png').split(',')[1];
            
            const expandPrompt = 'Expand the image to fill the empty space, maintaining the original style and content seamlessly.';
            generatePreview(expandPrompt, expandedImageB64, maskB64);
        };
        img.src = `data:${mimeType};base64,${currentImageB64}`;
    };

    const EditModeButton: React.FC<{
        mode: EditMode;
        current: EditMode;
        onClick: (mode: EditMode) => void;
        children: React.ReactNode;
    }> = ({ mode, current, onClick, children }) => (
        <button
            onClick={() => onClick(mode)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-sm font-semibold rounded-md transition ${mode === current ? 'bg-indigo-600 text-white shadow' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
        >
            {children}
        </button>
    );

    return (
        <>
            {editMode === 'mask' && currentImageB64 && <MaskingCanvas baseImageB64={currentImageB64} onClose={() => setEditMode('prompt')} onSave={(mask) => {setActiveMaskB64(mask); setEditMode('prompt');}} />}
            {isAddCharacterModalOpen && <AddCharacterModal onClose={() => setIsAddCharacterModalOpen(false)} onSave={handleSaveCharacter} />}
            {isAddStyleModalOpen && <AddStyleModal onClose={() => setIsAddStyleModalOpen(false)} onSave={handleSaveStyle} />}
            
            <header className="flex items-center justify-between mb-10 md:mb-12">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Project</span>
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    AI Image Editor
                </h1>
                <div className="w-32"></div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <div className="flex justify-between items-start gap-2">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Controls</h2>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={handleSaveToProject} disabled={!hasImage || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md">
                                <SaveIcon className="h-5 w-5" />
                                <span>Save & Exit</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1. Upload Image</label>
                        <input id="imageUpload" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900 transition" disabled={isLoading} />
                    </div>
                    
                    {previewImageB64 ? (
                        <div className="space-y-4 text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <p className="font-semibold text-indigo-800 dark:text-indigo-200">Confirm or Discard Preview</p>
                            <div className="flex justify-center space-x-4">
                                <button onClick={handleConfirmEdit} className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition shadow-md"><CheckIcon className="h-5 w-5" /><span>Confirm Edit</span></button>
                                <button onClick={handleDiscardPreview} className="flex-1 flex items-center justify-center space-x-2 bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition shadow-md"><XIcon className="h-5 w-5" /><span>Discard</span></button>
                            </div>
                        </div>
                    ) : (
                        hasImage && <div className="space-y-4">
                            <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                <EditModeButton mode="prompt" current={editMode} onClick={setEditMode}><PencilIcon className="w-4 h-4" /><span>Prompt</span></EditModeButton>
                                <EditModeButton mode="mask" current={editMode} onClick={setEditMode}><MaskIcon className="w-4 h-4" /><span>Mask</span></EditModeButton>
                                <EditModeButton mode="expand" current={editMode} onClick={setEditMode}><ExpandIcon className="w-4 h-4" /><span>Expand</span></EditModeButton>
                            </div>
                            
                            {editMode === 'prompt' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-2 gap-4">
                                        {activeProject?.characterSheet?.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">2. Use Character</label>
                                                <div className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-x-auto">
                                                    {activeProject.characterSheet.map(char => (
                                                        <button key={char.id} onClick={() => handleSelectCharacter(char.imageB64)} className={`flex-shrink-0 p-1.5 rounded-lg border-2 transition ${selectedCharacterB64 === char.imageB64 ? 'border-indigo-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-500'}`}>
                                                            <img src={`data:image/png;base64,${char.imageB64}`} alt={char.name} title={char.name} className="w-12 h-12 object-cover rounded-md" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {activeProject?.stylePalette?.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">3. Use Style</label>
                                                <div className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-x-auto">
                                                    {activeProject.stylePalette.map(style => (
                                                        <button key={style.id} onClick={() => handleSelectStyle(style.imageB64)} className={`flex-shrink-0 p-1.5 rounded-lg border-2 transition ${selectedStyleB64 === style.imageB64 ? 'border-teal-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-500'}`}>
                                                            <img src={`data:image/png;base64,${style.imageB64}`} alt={style.name} title={style.name} className="w-12 h-12 object-cover rounded-md" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <form onSubmit={handleManualPreview}>
                                        <div>
                                            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">4. Describe Your Edit</label>
                                            <input id="prompt" type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Make the sky look like a galaxy" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" disabled={isLoading || !hasImage} />
                                        </div>
                                    </form>
                                    <button type="button" onClick={(e) => handleManualPreview(e as any)} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg" disabled={isLoading || !hasImage || !prompt}>
                                        {isLoading ? <><LoaderIcon className="h-5 w-5" /><span>Generating Preview...</span></> : <><SparklesIcon className="h-5 w-5" /><span>Preview Edit</span></>}
                                    </button>
                                </div>
                            )}

                            {editMode === 'expand' && (
                                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg animate-fade-in">
                                    <h3 className="text-lg font-semibold">Generative Expand</h3>
                                    <div>
                                        <label htmlFor="expandSize" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Border Size ({expandSize}px)</label>
                                        <input id="expandSize" type="range" min="64" max="512" step="64" value={expandSize} onChange={(e) => setExpandSize(Number(e.target.value))} className="w-full" />
                                    </div>
                                    <button onClick={handleExpandImage} className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-transform transform hover:scale-105" disabled={isLoading}>
                                        Apply Expand
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {hasImage && (
                        <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                                <LayersIcon className="w-5 h-5" />
                                <span>Layers</span>
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {history.slice().reverse().map((layer, index) => {
                                    const reversedIndex = history.length - 1 - index;
                                    return (
                                        <div 
                                            key={layer.id} 
                                            onClick={() => handleSelectLayer(reversedIndex)}
                                            className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${historyIndex === reversedIndex ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                        >
                                            <div className="flex items-center space-x-2 overflow-hidden">
                                                <img src={`data:image/png;base64,${layer.imageB64}`} alt={layer.name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                                                <span className="text-sm font-medium truncate">{layer.name}</span>
                                            </div>
                                            {reversedIndex > 0 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteLayer(reversedIndex); }}
                                                    className="p-1.5 rounded-full text-slate-500 hover:bg-red-200 hover:text-red-700 dark:hover:bg-red-900/50 dark:hover:text-red-400 flex-shrink-0"
                                                    aria-label="Delete layer and subsequent layers"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                         <div className="flex justify-center items-center space-x-2 pt-4 border-t dark:border-slate-700">
                             <button onClick={() => setIsAddCharacterModalOpen(true)} disabled={!hasImage || isLoading || !!previewImageB64} className="flex-1 flex items-center justify-center space-x-2 bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-amber-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md whitespace-nowrap">
                                <UserIcon className="h-5 w-5" />
                                <span>Save as Character</span>
                            </button>
                             <button onClick={() => setIsAddStyleModalOpen(true)} disabled={!hasImage || isLoading || !!previewImageB64} className="flex-1 flex items-center justify-center space-x-2 bg-teal-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md whitespace-nowrap">
                                <PaletteIcon className="h-5 w-5" />
                                <span>Save as Style</span>
                            </button>
                        </div>

                        <div className="flex justify-center items-center space-x-2 pt-4 border-t dark:border-slate-700">
                            <button onClick={handleUndo} disabled={!canUndo || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition">
                                <UndoIcon className="h-5 w-5" />
                                <span>Undo</span>
                            </button>
                            <div className="w-28 text-center">
                                {hasImage && <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums">Step {historyIndex + 1} of {history.length}</span>}
                            </div>
                            <button onClick={handleRedo} disabled={!canRedo || isLoading || !!previewImageB64} className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition">
                                <RedoIcon className="h-5 w-5" />
                                <span>Redo</span>
                            </button>
                        </div>
                         <div className="border-t dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
                             <button onClick={handleCreateColoringPage} disabled={!hasImage || isLoading || !!previewImageB64 || isConverting} className="w-full flex items-center justify-center space-x-2 bg-fuchsia-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-fuchsia-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md">
                                {isConverting ? <><LoaderIcon className="h-5 w-5" /><span>Converting...</span></> : <><BrushIcon className="h-5 w-5" /><span>Create Coloring Page</span></>}
                            </button>
                            <button onClick={() => {if(currentImageB64 && mimeType) {onSendToVideoGenerator({ b64: currentImageB64, mimeType })}}} disabled={!hasImage || isLoading || !!previewImageB64} className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-md">
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