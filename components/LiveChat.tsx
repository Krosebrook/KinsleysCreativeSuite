import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, createBlob, decodeAudioData } from '../utils/helpers';
import { MicIcon, StopCircleIcon, LoaderIcon } from './icons';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Audio Context Setup ---
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
const outputNode = outputAudioContext.createGain();
outputNode.connect(outputAudioContext.destination);

export const LiveChat: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    // Playback state
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    // Visualizer state
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);


    const stopAudioPlayback = () => {
        sourcesRef.current.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors if the source is already stopped
            }
        });
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    };

    const stopRecording = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(console.error);
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
            inputAudioContextRef.current = null;
        }

        stopAudioPlayback();
        setIsRecording(false);
        setIsConnecting(false);
    };

    const drawVisualizer = () => {
        if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        
        const isDarkMode = document.documentElement.classList.contains('dark');
        canvasCtx.fillStyle = isDarkMode ? 'rgb(15 23 42)' : 'rgb(241 245 249)'; // slate-900 or slate-100
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = isDarkMode ? 'rgb(129 140 248)' : 'rgb(79 70 229)'; // indigo-400 or indigo-600
        
        canvasCtx.beginPath();
        
        const sliceWidth = canvas.width * 1.0 / analyserRef.current.frequencyBinCount;
        let x = 0;

        for (let i = 0; i < analyserRef.current.frequencyBinCount; i++) {
            const v = dataArrayRef.current[i] / 128.0;
            const y = v * canvas.height / 2;
    
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
    
            x += sliceWidth;
        }
        
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        
        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
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
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        // Setup visualizer
                        const analyser = inputAudioContext.createAnalyser();
                        analyser.fftSize = 2048;
                        analyserRef.current = analyser;
                        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

                        source.connect(analyser);
                        analyser.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);

                        drawVisualizer();
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64EncodedAudioString) {
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
                        setError(`An error occurred: ${e.message}. Please try again.`);
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
                    systemInstruction: 'You are a friendly and helpful creative assistant. Keep your responses concise.',
                },
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start recording.');
            setIsConnecting(false);
            stopRecording();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Live Conversation
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Speak directly with a Gemini-powered AI assistant in real-time.
                </p>
            </header>

            <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl text-center">
                <div className="mb-6 h-24 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    {isRecording && <canvas ref={canvasRef} className="w-full h-full" />}
                </div>

                {!isRecording && !isConnecting && (
                    <button
                        onClick={startRecording}
                        className="bg-indigo-600 text-white font-bold py-4 px-8 rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center mx-auto space-x-3 shadow-lg"
                    >
                        <MicIcon className="h-6 w-6" />
                        <span>Start Conversation</span>
                    </button>
                )}

                {isConnecting && (
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <LoaderIcon className="w-12 h-12" />
                        <p className="mt-2 font-semibold">Connecting...</p>
                    </div>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="bg-red-600 text-white font-bold py-4 px-8 rounded-full hover:bg-red-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center mx-auto space-x-3 shadow-lg"
                    >
                        <StopCircleIcon className="h-6 w-6" />
                        <span>Stop Conversation</span>
                    </button>
                )}

                {error && <p className="mt-4 text-center text-red-700 bg-red-100 p-3 rounded-lg">{error}</p>}
                
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                    {isRecording ? "Your microphone is active. Start speaking to the assistant." : "Click 'Start' to begin your conversation. Make sure to allow microphone access."}
                </p>
            </div>
        </>
    );
};
