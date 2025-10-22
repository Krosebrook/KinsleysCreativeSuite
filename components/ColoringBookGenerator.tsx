
import React, { useState } from 'react';
import { generateColoringPages } from '../services/geminiService';
import { createPdf } from '../services/pdfService';
import { LoaderIcon, SparklesIcon, DownloadIcon } from './icons';

export const ColoringBookGenerator: React.FC = () => {
    const [theme, setTheme] = useState('Magical Forest Animals');
    const [childName, setChildName] = useState('Alex');
    const [numPages, setNumPages] = useState(5);
    const [borderStyle, setBorderStyle] = useState('flowers and vines');
    const [subtitle, setSubtitle] = useState('A Journey into the Woods');
    const [artStyle, setArtStyle] = useState('simple cartoon style');
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPdfUrl(null);
        setLoadingMessage('');

        let generatedContent: { cover: string; pages: string[] } | null = null;
        
        // Step 1: Generate Images
        try {
            setLoadingMessage('Gemini is drawing your cover and pages...');
            generatedContent = await generateColoringPages(
                theme,
                childName,
                numPages,
                borderStyle,
                subtitle,
                artStyle
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
            setIsLoading(false);
            setLoadingMessage('');
            return;
        }

        // Step 2: Create PDF
        if (generatedContent) {
            try {
                setLoadingMessage('Assembling your coloring book PDF...');
                const url = await createPdf(generatedContent.cover, generatedContent.pages);
                setPdfUrl(url);
            } catch (err) {
                 setError("Images generated successfully, but the PDF creation failed. Please try again.");
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
            }
        }
    };
    
    const InputField = ({ label, value, onChange, placeholder, disabled }: { label: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled: boolean }) => (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                disabled={disabled}
            />
        </div>
    );

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    Personalized Coloring Book Creator
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                    Design a unique coloring book for your child in seconds.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                         <h2 className="text-2xl font-bold text-slate-800 mb-2">Book Details</h2>
                        <InputField label="Child's Name" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="e.g., Lily" disabled={isLoading} />
                        <InputField label="Book Theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., Space Adventure" disabled={isLoading} />
                        <InputField label="Book Subtitle (Optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g., A Galactic Journey" disabled={isLoading} />
                        <div>
                             <label htmlFor="numPages" className="block text-sm font-medium text-slate-700 mb-1">Number of Pages</label>
                             <input id="numPages" type="number" min="1" max="10" value={numPages} onChange={(e) => setNumPages(parseInt(e.target.value, 10))} className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" disabled={isLoading} />
                        </div>
                        <div>
                            <label htmlFor="artStyle" className="block text-sm font-medium text-slate-700 mb-1">Art Style</label>
                            <select
                                id="artStyle"
                                value={artStyle}
                                onChange={(e) => setArtStyle(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none"
                                disabled={isLoading}
                            >
                                <option value="simple cartoon style">Cartoonish</option>
                                <option value="a slightly realistic line art style">Slightly Realistic</option>
                                <option value="a geometric and abstract pattern style">Geometric/Abstract</option>
                            </select>
                        </div>
                        <InputField label="Border Style for Cover" value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)} placeholder="e.g., stars and planets" disabled={isLoading} />
                        
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-400/40"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <LoaderIcon className="h-5 w-5" />
                                    <span>Creating Your Book...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="h-5 w-5" />
                                    <span>Generate Coloring Book</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center justify-center">
                    {isLoading && (
                        <div className="text-center text-slate-500">
                             <LoaderIcon className="w-12 h-12 mx-auto mb-4" />
                             <p className="font-semibold">{loadingMessage}</p>
                             <p className="text-sm mt-2">This may take a moment.</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>}
                    {pdfUrl && !isLoading && (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Your Coloring Book is Ready!</h2>
                            <p className="text-slate-600 mb-6">Click the button below to open and download your personalized PDF.</p>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center space-x-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg"
                            >
                                <DownloadIcon className="h-5 w-5" />
                                <span>Download PDF</span>
                            </a>
                        </div>
                    )}
                    {!isLoading && !error && !pdfUrl && (
                        <div className="text-center text-slate-400">
                            <p className="text-lg">Your generated book will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
