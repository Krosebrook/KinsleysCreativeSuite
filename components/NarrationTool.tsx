import React, { useState, useEffect, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { useProjects } from '../contexts/ProjectContext';
import type { ProjectAsset } from '../types';
import { decode, decodeAudioData } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, ArrowLeftIcon, PlayIcon, PauseIcon, Volume2Icon, SaveIcon } from './icons';

interface NarrationToolProps {
    initialText?: string | null;
    onBack: () => void;
}

const voices = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir'];
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

export const NarrationTool: React.FC<NarrationToolProps> = ({ initialText, onBack }) => {
    const { addAsset } = useProjects();
    const [text, setText] = useState(
        initialText || 'TTS the following conversation:\nJoe: How\'s it going today Jane?\nJane: Not too bad, how about you?'
    );
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<{ b64: string; buffer: AudioBuffer } | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        return () => { // Cleanup on unmount
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }
        };
    }, []);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setAudioData(null);
        if (isPlaying) {
            audioSourceRef.current?.stop();
            setIsPlaying(false);
        }

        try {
            const audioB64 = await generateSpeech(text, selectedVoice);
            if (outputAudioContext.state === 'suspended') {
                await outputAudioContext.resume();
            }
            const buffer = await decodeAudioData(decode(audioB64), outputAudioContext, 24000, 1);
            setAudioData({ b64: audioB64, buffer });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate audio.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayPause = () => {
        if (!audioData) return;
        if (isPlaying) {
            audioSourceRef.current?.stop();
            setIsPlaying(false);
        } else {
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioData.buffer;
            source.connect(outputAudioContext.destination);
            source.onended = () => setIsPlaying(false);
            source.start(0);
            audioSourceRef.current = source;
            setIsPlaying(true);
        }
    };

    const handleSave = () => {
        if (!audioData) return;
        const assetName = `Narration: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
        const newAsset: ProjectAsset = {
            id: Date.now().toString(),
            type: 'audio',
            name: assetName,
            data: audioData.b64,
            prompt: text,
        };
        addAsset(newAsset);
        onBack();
    };

    return (
        <>
            <header className="flex items-center justify-between mb-10 md:mb-12">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Project</span>
                </button>
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        AI Narration Tool
                    </h1>
                     <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                        Convert text to high-quality speech with multiple voices.
                    </p>
                </div>
                <div className="w-36"></div>
            </header>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">1. Configuration</h2>
                     <div>
                        <label htmlFor="narrationText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Text to Narrate</label>
                        <textarea
                            id="narrationText"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={10}
                            placeholder="Enter your script here..."
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            disabled={isLoading}
                        />
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">For multi-speaker dialogue, use the format "SpeakerName: Dialogue text".</p>
                    </div>
                     <div>
                        <label htmlFor="voiceSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Voice</label>
                        <select id="voiceSelect" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" disabled={isLoading}>
                            {voices.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !text} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 flex items-center justify-center space-x-2 shadow-lg">
                        {isLoading ? <><LoaderIcon className="h-5 w-5"/><span>Generating...</span></> : <><SparklesIcon className="h-5 w-5"/><span>Generate Audio</span></>}
                    </button>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">2. Preview & Save</h2>
                    {isLoading && <div className="text-center"><LoaderIcon className="w-12 h-12 text-indigo-500" /><p className="mt-2 font-semibold">Generating audio...</p></div>}
                    {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
                    {audioData && !isLoading && (
                        <div className="w-full space-y-6 text-center animate-fade-in">
                            <div className="flex items-center justify-center space-x-4">
                                <button onClick={handlePlayPause} className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700">
                                    {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                </button>
                                <p className="font-semibold text-lg">Playback</p>
                            </div>
                             <button onClick={handleSave} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 shadow-lg">
                                <SaveIcon className="h-5 w-5"/>
                                <span>Save Narration to Project</span>
                            </button>
                        </div>
                    )}
                    {!audioData && !isLoading && !error && (
                        <div className="text-center text-slate-400 dark:text-slate-500">
                            <Volume2Icon className="w-16 h-16 mx-auto mb-4"/>
                            <p>Your generated audio will appear here.</p>
                        </div>
                    )}
                </div>
             </div>
        </>
    );
};