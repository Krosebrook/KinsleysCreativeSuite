import React, { useState, useRef, useEffect } from 'react';
// Fix: Removed `LiveSession` as it's not an exported member.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, createBlob, decodeAudioData } from '../utils/helpers';
import { MicIcon, StopCircleIcon, LoaderIcon } from './icons';

// Fix: Initialized the GoogleGenAI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Audio Context Setup ---
// Fix: Cast window to `any` to allow fallback for `webkitAudioContext` without TypeScript errors.
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
const outputNode = outputAudioContext.createGain();
outputNode.connect(outputAudioContext.destination);

// Fix: Implemented the full LiveChat component.
export const LiveChat: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fix: Used ReturnType to get the type of the session promise without importing LiveSession.
    const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    // Playback state
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const stopAudioPlayback = () => {
        sourcesRef.current.forEach(source => {
            source.stop();
        });
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    };

    const stopRecording = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }

        stopAudioPlayback();
        setIsRecording(false);
        setIsConnecting(false);
    };

    const startRecording = async () => {
        setIsConnecting(true);
        setError(null);
        stopAudioPlayback();

        try {
            if (outputAudioContext.state === 'suspended') {
                await outputAudioContext.resume();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // Fix: Cast window to `any` to allow fallback for `webkitAudioContext` without TypeScript errors.
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            inputAudioContextRef.current = inputAudioContext;
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsRecording(true);
                        
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            
                            // Fix: Used the session promise from the outer scope to prevent race conditions and stale closures.
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64EncodedAudioString) {
                            // Fix: Implemented gapless audio playback logic.
                            nextStartTimeRef.current = Math.max(
                                nextStartTimeRef.current,
                                outputAudioContext.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(
                                decode(base64EncodedAudioString),
                                outputAudioContext,
                                24000,
                                1,
                            );
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            stopAudioPlayback();
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API error:', e);
                        const errorMessage = e.message 
                            ? `A connection error occurred: ${e.message}` 
                            : 'A connection error occurred. Please check your network and try again.';
                        setError(errorMessage);
                        stopRecording();
                    },
                    onclose: (e: CloseEvent) => {
                        stopRecording();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: 'You are a friendly and helpful conversational AI.',
                },
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Could not access microphone. Please check permissions and try again.');
            setIsConnecting(false);
        }
    };
    
    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    Live Conversation with Gemini
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                    Have a real-time, voice-to-voice chat with the AI.
                </p>
            </header>
            
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl text-center">
                <div className="flex flex-col items-center justify-center space-y-6">
                    <p className="text-slate-600">
                        {isRecording ? "I'm listening... Talk to me!" : isConnecting ? "Connecting to Gemini..." : "Press the button and start speaking."}
                    </p>
                    
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isConnecting}
                        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                        } ${isConnecting ? 'bg-slate-300 cursor-not-allowed' : ''}`}
                    >
                        {isConnecting ? (
                            <LoaderIcon className="h-10 w-10 text-white" />
                        ) : isRecording ? (
                            <StopCircleIcon className="h-12 w-12 text-white" />
                        ) : (
                            <MicIcon className="h-10 w-10 text-white" />
                        )}
                    </button>
                    
                    {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
                </div>
            </div>
        </>
    );
};