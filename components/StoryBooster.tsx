import React, { useState, useEffect } from 'react';
import { analyzeText, improveText, suggestTitles, generateStoryIdea } from '../services/geminiService';
import { LoaderIcon, SparklesIcon, BookOpenIcon } from './icons';

const AUTOSAVE_KEY = 'storyBooster_autosavedText';

export const StoryBooster: React.FC = () => {
    const [text, setText] = useState(
`The old lighthouse stood on the cliff's edge, a lonely sentinel against the raging sea. Every night, its beam cut through the darkness, a beacon of hope for sailors. But tonight, the light was gone. A young girl named Elara, who lived in the nearby village, noticed its absence. She knew the lighthouse keeper, old Finn, would never let the light go out. Something was wrong.`
    );
    const [prompt, setPrompt] = useState('A librarian who discovers a book that writes itself.');
    const [result, setResult] = useState<string | string[] | null>(null);
    const [resultTitle, setResultTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'edit' | 'generate'>('edit');

    // Load saved text from local storage on component mount
    useEffect(() => {
        const savedText = localStorage.getItem(AUTOSAVE_KEY);
        if (savedText) {
            setText(savedText);
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    // Auto-save text to local storage every 60 seconds
    useEffect(() => {
        const timerId = setInterval(() => {
            if (text) {
                localStorage.setItem(AUTOSAVE_KEY, text);
            }
        }, 60000); // 60 seconds

        return () => {
            clearInterval(timerId); // Cleanup the interval on component unmount or text change
        };
    }, [text]); // This effect runs whenever the 'text' state changes

    const handleAction = async (action: 'analyze' | 'improve' | 'titles' | 'idea') => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        let currentLoadingMessage = '';
        try {
            let response;
            switch (action) {
                case 'analyze':
                    setResultTitle('Story Analysis');
                    setLoadingMessage('Analyzing your text with Gemini Pro...');
                    response = await analyzeText(text);
                    break;
                case 'improve':
                    setResultTitle('Improved Text');
                    setLoadingMessage('Improving your text with Gemini Pro...');
                    response = await improveText(text);
                    break;
                case 'titles':
                    setResultTitle('Title Suggestions');
                    setLoadingMessage('Brainstorming titles with Gemini Flash...');
                    response = await suggestTitles(text);
                    break;
                case 'idea':
                    setResultTitle('Generated Story Idea');
                    setLoadingMessage('Generating a story idea with Gemini Flash...');
                    response = await generateStoryIdea(prompt);
                    break;
            }
            setResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const ActionButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; fullWidth?: boolean }> = ({ onClick, disabled, children, fullWidth = false }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center space-x-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg ${fullWidth ? 'w-full' : ''}`}
        >
            <SparklesIcon className="h-5 w-5" />
            <span>{children}</span>
        </button>
    );

    const renderResult = () => {
        if (!result) return null;

        if (typeof result === 'string') {
            // Using <pre> to respect markdown formatting and newlines from the API
            return <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 p-4 rounded-lg">{result}</pre>;
        }
        
        if (Array.isArray(result)) {
            return (
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                    {result.map((title, index) => (
                        <li key={index} className="bg-slate-50 p-2 rounded">{title}</li>
                    ))}
                </ul>
            );
        }
        return null;
    };

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    Story Booster
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
                    Your AI writing partner. Get feedback on your draft, improve your prose, or generate a fresh idea to beat writer's block.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <div className="flex border-b mb-6">
                        <button onClick={() => setActiveTab('edit')} className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'edit' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}>
                            Write & Edit
                        </button>
                        <button onClick={() => setActiveTab('generate')} className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'generate' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}>
                            Generate Idea
                        </button>
                    </div>

                    {activeTab === 'edit' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label htmlFor="storyText" className="block text-sm font-medium text-slate-700 mb-1">Your Story Draft</label>
                                <textarea
                                    id="storyText"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    rows={14}
                                    placeholder="Paste your story here..."
                                    className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ActionButton onClick={() => handleAction('analyze')} disabled={isLoading || !text}>Analyze</ActionButton>
                                <ActionButton onClick={() => handleAction('improve')} disabled={isLoading || !text}>Improve</ActionButton>
                                <ActionButton onClick={() => handleAction('titles')} disabled={isLoading || !text}>Titles</ActionButton>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                             <div>
                                <label htmlFor="ideaPrompt" className="block text-sm font-medium text-slate-700 mb-1">Story Prompt</label>
                                <input
                                    id="ideaPrompt"
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., A detective who is also a ghost"
                                    className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    disabled={isLoading}
                                />
                             </div>
                             <ActionButton onClick={() => handleAction('idea')} disabled={isLoading || !prompt} fullWidth>Generate Idea</ActionButton>
                        </div>
                    )}
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex-shrink-0">{resultTitle || "Results"}</h2>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        {isLoading && (
                            <div className="text-center text-slate-500 flex flex-col items-center justify-center h-full">
                                <LoaderIcon className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-semibold">{loadingMessage}</p>
                            </div>
                        )}
                        {error && <p className="text-center text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>}
                        {result && !isLoading && (
                            <div className="animate-fade-in">
                                {renderResult()}
                            </div>
                        )}
                        {!isLoading && !error && !result && (
                            <div className="text-center text-slate-400 flex flex-col items-center justify-center h-full">
                                <BookOpenIcon className="w-16 h-16 mb-4" />
                                <p className="text-lg">Your results will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};