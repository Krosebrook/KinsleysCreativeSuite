import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { BotIcon, LoaderIcon, MessageSquareIcon, SendIcon, SparklesIcon, XIcon, PaperclipIcon, UserIcon, CheckIcon } from './icons';
import { sendMessageToModel } from '../services/geminiService';
import { useProjects } from '../contexts/ProjectContext';
import { fileToBase64 } from '../utils/helpers';

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hello! How can I help? You can ask about your project or upload an image.', timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useGrounded, setUseGrounded] = useState(false);
    
    const [imageToSend, setImageToSend] = useState<{ b64: string; mimeType: string; url: string } | null>(null);
    const [copiedTimestamp, setCopiedTimestamp] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { activeProject } = useProjects();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const b64 = await fileToBase64(file);
                const url = URL.createObjectURL(file);
                setImageToSend({ b64, mimeType: file.type, url });
                if (useGrounded) {
                    setUseGrounded(false); // Grounded search isn't compatible with images
                }
            } catch (error) {
                console.error("Error processing file:", error);
            }
        }
    };

    const handleCopyMessage = (textToCopy: string, timestamp: number) => {
        if (!textToCopy) return; // Don't attempt to copy empty or image-only messages
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                setCopiedTimestamp(timestamp);
                setTimeout(() => {
                    setCopiedTimestamp(null);
                }, 2000); // Display feedback for 2 seconds
            })
            .catch(err => {
                console.error('Failed to copy message: ', err);
            });
    };

    const handleSend = async () => {
        if ((input.trim() === '' && !imageToSend) || isLoading) return;

        const userMessage: Message = { 
            role: 'user', 
            text: input,
            ...(imageToSend && { imageB64: imageToSend.b64, mimeType: imageToSend.mimeType }),
            timestamp: Date.now()
        };
        
        // Use a functional update to get the latest messages state for the API call
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);

        const currentInput = input;
        const currentImage = imageToSend;
        
        setInput('');
        setImageToSend(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        setIsLoading(true);

        try {
            const modelMessage = await sendMessageToModel(
                currentInput,
                messages, // Pass the history *before* the new user message
                activeProject,
                currentImage ? { b64: currentImage.b64, mimeType: currentImage.mimeType } : null,
                useGrounded
            );
            setMessages(prev => [...prev, { ...modelMessage, timestamp: Date.now() }]);
        } catch (err) {
            let userFriendlyMessage = 'An unexpected error occurred during the chat. Please try again.';

            if (err instanceof Error) {
                userFriendlyMessage = `An error occurred: ${err.message}`;
            }
            
            const errorMessage: Message = { role: 'model', text: userFriendlyMessage, timestamp: Date.now() };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            if (currentImage) {
                URL.revokeObjectURL(currentImage.url);
            }
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 z-40"
                aria-label="Open chat"
            >
                <MessageSquareIcon className="h-8 w-8" />
            </button>
        );
    }
    
    return (
        <div className="fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-md h-[70vh] max-h-[600px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in">
            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <BotIcon className="h-6 w-6 text-indigo-500"/>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Creative Assistant</h2>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    aria-label="Close chat"
                >
                    <XIcon className="h-5 w-5" />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                         <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                            {msg.role === 'user' ? (
                                <UserIcon className="w-5 h-5 text-white" />
                            ) : (
                                <BotIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            )}
                        </div>
                        <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div 
                                className={`relative p-3 rounded-2xl shadow-sm cursor-pointer transition-shadow hover:shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}
                                onClick={() => handleCopyMessage(msg.text, msg.timestamp)}
                                title="Click to copy message"
                            >
                                {copiedTimestamp === msg.timestamp && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-2xl animate-fade-in">
                                        <CheckIcon className="w-5 h-5 text-white" />
                                        <span className="ml-1 text-white font-bold text-sm">Copied!</span>
                                    </div>
                                )}
                                {msg.imageB64 && msg.mimeType && (
                                    <img src={`data:${msg.mimeType};base64,${msg.imageB64}`} alt="User upload" className="mb-2 rounded-lg max-w-full h-auto" />
                                )}
                                {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className={`mt-2 pt-2 border-t ${msg.role === 'user' ? 'border-indigo-300/50' : 'border-slate-200 dark:border-slate-600'}`}>
                                        <h4 className={`text-xs font-semibold mb-1 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>Sources:</h4>
                                        <ul className="space-y-1">
                                            {msg.sources.map((source, i) => (
                                                <li key={i}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className={`text-xs hover:underline truncate block ${msg.role === 'user' ? 'text-indigo-200' : 'text-indigo-400 dark:text-indigo-300'}`}>
                                                        {i+1}. {source.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                             <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-slate-200 dark:bg-slate-600">
                             <BotIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none flex items-center space-x-2 shadow-sm">
                            <LoaderIcon className="h-5 w-5 text-slate-400"/>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl flex-shrink-0">
                 <div className="flex items-center justify-center mb-3">
                    <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                        <input type="checkbox" checked={useGrounded} onChange={() => setUseGrounded(!useGrounded)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500" disabled={!!imageToSend} />
                        <span>Search Web with Google</span>
                        <SparklesIcon className="h-4 w-4 text-yellow-500" />
                    </label>
                </div>
                 {imageToSend && (
                    <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <img src={imageToSend.url} alt="Preview" className="w-10 h-10 object-cover rounded"/>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Image attached</span>
                        </div>
                        <button onClick={() => { URL.revokeObjectURL(imageToSend.url); setImageToSend(null); }} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                            <XIcon className="h-4 w-4"/>
                        </button>
                    </div>
                )}
                <div className="flex items-center space-x-2">
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                     <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition" aria-label="Attach image" disabled={isLoading}>
                        <PaperclipIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask me anything..."
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || (input.trim() === '' && !imageToSend)}
                        className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                        aria-label="Send message"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};