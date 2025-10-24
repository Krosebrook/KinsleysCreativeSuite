import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { BotIcon, LoaderIcon, MessageSquareIcon, SendIcon, SparklesIcon, XIcon } from './icons';
import { groundedChat } from '../services/geminiService';
import type { Chat } from '@google/genai';


interface ChatbotProps {
    chatInstance: Chat;
}

export const Chatbot: React.FC<ChatbotProps> = ({ chatInstance }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hello! How can I help you be creative today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useGrounded, setUseGrounded] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
    
    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            if (useGrounded) {
                const modelMessage = await groundedChat(currentInput);
                setMessages(prev => [...prev, modelMessage]);
            } else {
                const response = await chatInstance.sendMessage({ message: currentInput });
                const modelMessage: Message = { role: 'model', text: response.text };
                setMessages(prev => [...prev, modelMessage]);
            }
        } catch (err) {
            let userFriendlyMessage = 'An unexpected error occurred during the chat. Please try again.';

            if (err instanceof Error) {
                const message = err.message.toLowerCase();
                if (message.includes('api key not valid')) {
                    userFriendlyMessage = 'The API key is invalid. Please ensure it is configured correctly.';
                } else if (message.includes('quota') || message.includes('rate limit')) {
                    userFriendlyMessage = 'The API quota has been exceeded. Please check your usage or try again later.';
                } else if (message.includes('safety')) {
                    userFriendlyMessage = 'Your prompt was blocked due to safety settings. Please try rephrasing your message.';
                } else if (message.includes('failed to fetch')) {
                    userFriendlyMessage = 'A network error occurred. Please check your connection and try again.';
                } else {
                    // Fallback to the original error message for other cases, keeping it user-facing.
                    userFriendlyMessage = `An error occurred: ${err.message}`;
                }
            }
            
            const errorMessage: Message = { role: 'model', text: userFriendlyMessage };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
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
        <div className="fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-md h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in">
            <header className="flex items-center justify-between p-4 border-b bg-slate-50 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <BotIcon className="h-6 w-6 text-indigo-600"/>
                    <h2 className="text-lg font-bold text-slate-800">Creative Assistant</h2>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full text-slate-500 hover:bg-slate-200"
                    aria-label="Close chat"
                >
                    <XIcon className="h-5 w-5" />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                    <h4 className="text-xs font-semibold mb-1 text-slate-500">Sources:</h4>
                                    <ul className="space-y-1">
                                        {msg.sources.map((source, i) => (
                                            <li key={i}>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline truncate block">
                                                    {i+1}. {source.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-none flex items-center space-x-2 shadow-sm">
                            <LoaderIcon className="h-5 w-5 text-slate-400"/>
                            <span className="text-sm text-slate-500">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white rounded-b-2xl flex-shrink-0">
                 <div className="flex items-center justify-center mb-3">
                    <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-600 p-2 rounded-full hover:bg-slate-100 transition">
                        <input type="checkbox" checked={useGrounded} onChange={() => setUseGrounded(!useGrounded)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span>Search Web with Google</span>
                        <SparklesIcon className="h-4 w-4 text-yellow-500" />
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask me anything..."
                        className="flex-1 px-4 py-2 bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || input.trim() === ''}
                        className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                        aria-label="Send message"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};