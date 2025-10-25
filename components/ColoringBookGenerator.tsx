import React, { useState, useRef, useEffect } from 'react';
import { generateColoringPages } from '../services/geminiService';
import { createPdf } from '../services/pdfService';
import { LoaderIcon, SparklesIcon, DownloadIcon, PencilIcon } from './icons';
import { DrawingCanvas } from './DrawingCanvas';

// In-file component for the editing modal
const ImageEditModal: React.FC<{
    imageB64: string;
    onClose: () => void;
    onSave: (newB64: string) => void;
}> = ({ imageB64, onClose, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Aspect ratio 4:3
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    const handleSave = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        onSave(base64);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-4xl w-full">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">Edit Image</h3>
                <DrawingCanvas 
                    ref={canvasRef}
                    initialImageB64={imageB64}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                />
                <div className="flex justify-center space-x-4 mt-4">
                    <button onClick={onClose} className="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-600 transition">Cancel</button>
                    <button onClick={handleSave} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition">Save & Close</button>
                </div>
            </div>
        </div>
    );
};

interface ColoringBookGeneratorProps {
    initialPrompt?: string | null;
    initialImage?: string | null;
}

export const ColoringBookGenerator: React.FC<ColoringBookGeneratorProps> = ({ initialPrompt, initialImage }) => {
    const [theme, setTheme] = useState('Magical Forest Animals');
    const [childName, setChildName] = useState('Alex');
    const [numPages, setNumPages] = useState(5);
    const [borderStyle, setBorderStyle] = useState('flowers and vines');
    const [subtitle, setSubtitle] = useState('A Journey into the Woods');
    const [artStyle, setArtStyle] = useState('simple cartoon style');
    const [customPrompt, setCustomPrompt] = useState('');
    const [coverPrompt, setCoverPrompt] = useState('A friendly dragon reading a book to a group of forest animals');
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    
    const [editedContent, setEditedContent] = useState<{ cover: string; pages: string[] } | null>(null);
    const [isEditing, setIsEditing] = useState<{ type: 'cover' | 'page'; index: number; } | null>(null);

    useEffect(() => {
        if (initialPrompt) {
            setCustomPrompt(initialPrompt);
        }
    }, [initialPrompt]);

    useEffect(() => {
        if (initialImage) {
            // Set the component state to show this image ready for editing
            setEditedContent({ cover: initialImage, pages: [] });
            // Clear the form fields to avoid confusion
            setTheme('Custom Coloring Page');
            setChildName('');
            setNumPages(1); // Set to 1 as we only have one page
            setBorderStyle('');
            setSubtitle('');
            setArtStyle('simple cartoon style');
            setCustomPrompt('');
            setCoverPrompt('');
            setPdfUrl(null); // Ensure no old PDF is showing
            setError(null);
        }
    }, [initialImage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPdfUrl(null);
        setEditedContent(null);
        setIsEditing(null);
        
        try {
            setLoadingMessage('Gemini is drawing your cover and pages...');
            const generatedContent = await generateColoringPages(
                theme,
                childName,
                numPages,
                borderStyle,
                subtitle,
                artStyle,
                customPrompt,
                coverPrompt
            );
            // Deep copy to allow for edits without affecting original
            setEditedContent(JSON.parse(JSON.stringify(generatedContent)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleCreatePdf = async () => {
        if (!editedContent) return;
        setIsLoading(true);
        setError(null);
        setLoadingMessage('Assembling your coloring book PDF...');
        try {
            const url = await createPdf(editedContent.cover, editedContent.pages);
            setPdfUrl(url);
        } catch (err) {
            setError("PDF creation failed. Please try again.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleReset = () => {
        setPdfUrl(null);
        setEditedContent(null);
        setError(null);
        setIsEditing(null);
    };

    const InputField = ({ label, value, onChange, placeholder, disabled }: { label: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled: boolean }) => (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                disabled={disabled}
            />
        </div>
    );

    return (
        <>
            {isEditing && editedContent && (
                <ImageEditModal
                    imageB64={isEditing.type === 'cover' ? editedContent.cover : editedContent.pages[isEditing.index]}
                    onClose={() => setIsEditing(null)}
                    onSave={(newB64) => {
                        if (isEditing.type === 'cover') {
                            setEditedContent(prev => prev ? { ...prev, cover: newB64 } : null);
                        } else {
                            setEditedContent(prev => {
                                if (!prev) return null;
                                const newPages = [...prev.pages];
                                newPages[isEditing.index] = newB64;
                                return { ...prev, pages: newPages };
                            });
                        }
                        setIsEditing(null);
                    }}
                />
            )}
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Personalized Coloring Book Creator
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Design a unique coloring book, edit the pages, and generate a PDF.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                         <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Book Details</h2>
                        <InputField label="Child's Name" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="e.g., Lily" disabled={isLoading} />
                        <InputField label="Book Theme (for inner pages)" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., Space Adventure" disabled={isLoading} />
                        <InputField label="Book Subtitle (Optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g., A Galactic Journey" disabled={isLoading} />
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cover Art Prompt (Optional)</label>
                            <textarea
                                value={coverPrompt}
                                onChange={(e) => setCoverPrompt(e.target.value)}
                                placeholder="Describe the cover scene, e.g., A happy robot waving from its spaceship"
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                rows={3}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">General AI Prompt (Optional)</label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="e.g., Make all the animals wear silly hats. Include hidden stars on every page."
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                rows={3}
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                             <label htmlFor="numPages" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Pages</label>
                             <input id="numPages" type="number" min="1" max="10" value={numPages} onChange={(e) => setNumPages(parseInt(e.target.value, 10))} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" disabled={isLoading} />
                        </div>
                        <div>
                            <label htmlFor="artStyle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Art Style</label>
                            <select
                                id="artStyle"
                                value={artStyle}
                                onChange={(e) => setArtStyle(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none"
                                disabled={isLoading}
                            >
                                <option value="simple cartoon style">Cartoonish</option>
                                <option value="a slightly realistic line art style">Slightly Realistic</option>
                                <option value="a geometric and abstract pattern style">Geometric/Abstract</option>
                                <option value="whimsical watercolor line art style">Whimsical Watercolor</option>
                                <option value="bold and graphic pop art style">Bold Graphic Art</option>
                                <option value="a detailed and fine etching style">Detailed Etching</option>
                            </select>
                        </div>
                        <InputField label="Border Style for Cover" value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)} placeholder="e.g., stars and planets" disabled={isLoading} />
                        
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-400/40"
                            disabled={isLoading}
                        >
                            {isLoading && !loadingMessage.includes('PDF') ? (
                                <><LoaderIcon className="h-5 w-5" /><span>Generating Images...</span></>
                            ) : (
                                <><SparklesIcon className="h-5 w-5" /><span>1. Generate Images</span></>
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl flex flex-col min-h-[500px] lg:min-h-0">
                    {isLoading && (
                        <div className="text-center text-slate-500 dark:text-slate-400 m-auto">
                             <LoaderIcon className="w-12 h-12 mx-auto mb-4" />
                             <p className="font-semibold">{loadingMessage}</p>
                             <p className="text-sm mt-2">This may take a moment.</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg m-auto">{error}</p>}
                    {pdfUrl && !isLoading && (
                        <div className="text-center flex flex-col h-full">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex-shrink-0">Your Coloring Book is Ready!</h2>
                            <div className="flex-grow bg-slate-200 dark:bg-slate-700 rounded-lg p-1 overflow-hidden shadow-inner">
                                <iframe
                                    src={pdfUrl}
                                    title="Coloring Book Preview"
                                    className="w-full h-full border-none rounded-md"
                                />
                            </div>
                            <div className="flex-shrink-0 mt-4 space-y-3">
                                <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={`${childName.replace(/\s+/g, '_')}_Coloring_Adventure.pdf`}
                                    className="inline-flex items-center justify-center w-full space-x-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg"
                                >
                                    <DownloadIcon className="h-5 w-5" />
                                    <span>Download PDF</span>
                                </a>
                                 <button
                                    onClick={handleReset}
                                    className="w-full bg-slate-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-600 transition"
                                >
                                    Create a New Book
                                </button>
                            </div>
                        </div>
                    )}
                    {editedContent && !pdfUrl && !isLoading && (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Review & Edit Your Pages</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">Click the edit button on any image to draw or erase before creating the PDF.</p>
                            
                            <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                {[editedContent.cover, ...editedContent.pages].map((imgB64, index) => (
                                    <div key={index} className="flex items-center space-x-4 p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm">
                                        <img src={`data:image/png;base64,${imgB64}`} alt={index === 0 ? 'Cover Page' : `Page ${index}`} className="w-20 h-16 object-cover rounded" />
                                        <p className="flex-1 font-semibold text-slate-700 dark:text-slate-300">{index === 0 ? 'Cover Page' : `Page ${index}`}</p>
                                        <button onClick={() => setIsEditing({ type: index === 0 ? 'cover' : 'page', index: index === 0 ? 0 : index - 1 })} className="p-2 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">
                                            <PencilIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleCreatePdf}
                                className="w-full mt-6 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-slate-300 flex items-center justify-center space-x-2 shadow-lg"
                                disabled={isLoading}
                            >
                                <DownloadIcon className="h-5 w-5" />
                                <span>2. Create Final PDF</span>
                            </button>
                        </div>
                    )}
                    {!isLoading && !error && !pdfUrl && !editedContent && (
                        <div className="text-center text-slate-400 dark:text-slate-500 m-auto">
                            <p className="text-lg">Your generated book will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};