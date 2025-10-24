import React, { useState, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon } from './icons';

interface AnimationConfig {
    type: 'none' | 'fadeInOut' | 'slide' | 'bounce' | 'typewriter';
    direction: 'left' | 'right' | 'top' | 'bottom';
    speed: number;
}

export const VideoGenerator: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<{b64: string, file: File} | null>(null);
    const [prompt, setPrompt] = useState('A neon hologram of a cat driving at top speed');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    // Video generation state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // API Key state
    const [isKeySelected, setIsKeySelected] = useState(false);

    // Text overlay state
    const [overlayText, setOverlayText] = useState('Hello, Gemini!');
    const [fontFamily, setFontFamily] = useState('Impact');
    const [fontColor, setFontColor] = useState('#FFFFFF');
    const [fontSize, setFontSize] = useState(52);
    const [animationConfig, setAnimationConfig] = useState<AnimationConfig>({
        type: 'fadeInOut',
        direction: 'left',
        speed: 1.0,
    });
    const [isProcessingOverlay, setIsProcessingOverlay] = useState(false);


    useEffect(() => {
        const checkKey = async () => {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsKeySelected(hasKey);
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setIsKeySelected(true);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setVideoUrl(null);
            setError(null);
            const b64 = await fileToBase64(file);
            setSourceImage({ b64, file });
        }
    };

    const handleGenerateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceImage || !prompt) {
            setError("Please upload an image and provide a prompt.");
            return;
        }
        if (!isKeySelected) {
            setError("Please select an API key to generate videos.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        
        try {
            const url = await generateVideo(
                sourceImage.b64, 
                sourceImage.file.type, 
                prompt, 
                aspectRatio,
                (message) => setLoadingMessage(message)
            );
            setVideoUrl(url);
        } catch (err) {
            if (err instanceof Error && err.message.includes("re-select your API key")) {
                setIsKeySelected(false);
            }
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const applyTextOverlay = async () => {
        if (!videoUrl || !overlayText) return;

        setIsProcessingOverlay(true);
        setError(null);

        try {
            const video = document.createElement('video');
            video.muted = true;
            video.crossOrigin = "anonymous";

            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = () => reject(new Error("Failed to load video for processing."));
                video.src = videoUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context.");

            const stream = canvas.captureStream();
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

            const recorderPromise = new Promise<string>((resolve) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    resolve(URL.createObjectURL(blob));
                };
            });

            recorder.start();

            // --- Animation Helper Functions ---
            const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const easeOutBounce = (x: number) => {
                const n1 = 7.5625;
                const d1 = 2.75;
                if (x < 1 / d1) { return n1 * x * x; }
                else if (x < 2 / d1) { return n1 * (x -= 1.5 / d1) * x + 0.75; }
                else if (x < 2.5 / d1) { return n1 * (x -= 2.25 / d1) * x + 0.9375; }
                else { return n1 * (x -= 2.625 / d1) * x + 0.984375; }
            };
            
            const drawFrame = () => {
                if (video.paused || video.ended) {
                    if (recorder.state === 'recording') recorder.stop();
                    return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const { currentTime, duration } = video;
                const { type, direction, speed } = animationConfig;

                const scaledFontSize = (fontSize / 720) * canvas.height;
                ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;
                ctx.fillStyle = fontColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;

                const textMetrics = ctx.measureText(overlayText);
                const textWidth = textMetrics.width;
                
                let x = canvas.width / 2;
                let y = canvas.height - (scaledFontSize * 0.5);
                ctx.globalAlpha = 1.0;
                let textToRender = overlayText;
                
                switch (type) {
                    case 'fadeInOut': {
                        const fadeDuration = 1.0 / speed;
                        let alpha = 1.0;
                        if (currentTime < fadeDuration) alpha = currentTime / fadeDuration;
                        else if (currentTime > duration - fadeDuration) alpha = (duration - currentTime) / fadeDuration;
                        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                        break;
                    }
                    case 'slide': {
                        const animDuration = 1.5 / speed;
                        let progressIn = Math.min(1, currentTime / animDuration);
                        let progressOut = Math.max(0, (duration - currentTime) / animDuration);

                        if (currentTime < animDuration) { // Slide In
                            const easedProgress = easeInOutCubic(progressIn);
                            if (direction === 'left') x = easedProgress * (canvas.width / 2 + textWidth / 2) - textWidth / 2;
                            if (direction === 'right') x = canvas.width - (easedProgress * (canvas.width / 2 + textWidth / 2) - textWidth / 2);
                            if (direction === 'top') y = easedProgress * y;
                            if (direction === 'bottom') y = canvas.height - (easedProgress * (canvas.height - y));
                        } else if (currentTime > duration - animDuration) { // Slide Out
                            const easedProgress = 1 - easeInOutCubic(1 - progressOut);
                            if (direction === 'left') x = canvas.width / 2 - (easedProgress * (canvas.width / 2 + textWidth / 2));
                            if (direction === 'right') x = canvas.width / 2 + (easedProgress * (canvas.width / 2 + textWidth / 2));
                            if (direction === 'top') y = y - easedProgress * (y + scaledFontSize);
                            if (direction === 'bottom') y = y + easedProgress * (canvas.height - y + scaledFontSize);
                        }
                        break;
                    }
                    case 'typewriter': {
                        const timePerChar = 0.1 / speed;
                        if (currentTime < overlayText.length * timePerChar) {
                             const numChars = Math.floor(currentTime / timePerChar);
                             textToRender = overlayText.substring(0, numChars);
                        }
                        break;
                    }
                    case 'bounce': {
                        const bounceDuration = 2.0 / speed;
                        if (currentTime < bounceDuration) {
                            const progress = currentTime / bounceDuration;
                            const bounceProgress = easeOutBounce(progress);
                            const startY = -scaledFontSize;
                            const endY = canvas.height - (scaledFontSize * 0.5);
                            y = startY + (endY - startY) * bounceProgress;
                        }
                        break;
                    }
                }

                ctx.fillText(textToRender, x, y);
                
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

                requestAnimationFrame(drawFrame);
            };
            
            video.onplay = () => requestAnimationFrame(drawFrame);
            await video.play();

            const newVideoUrl = await recorderPromise;
            URL.revokeObjectURL(videoUrl); // Clean up old blob URL
            setVideoUrl(newVideoUrl);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to apply text overlay.");
        } finally {
            setIsProcessingOverlay(false);
        }
    };
    
    if (!isKeySelected) {
        return (
             <div className="text-center max-w-lg mx-auto bg-yellow-50 p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-yellow-900 mb-4">API Key Required for Video Generation</h2>
                <p className="text-yellow-800 mb-6">The Veo video generation model requires you to select your own API key. This ensures you are aware of the associated billing.</p>
                <button
                    onClick={handleSelectKey}
                    className="bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors shadow-md hover:shadow-lg"
                >
                    Select API Key
                </button>
                 <p className="mt-4 text-xs text-slate-500">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">billing documentation</a>.</p>
             </div>
        );
    }

    const fonts = ['Arial', 'Georgia', 'Verdana', 'Comic Sans MS', 'Impact'];

    return (
        <>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                    Photo to Video Magic
                </h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                   Bring your photos to life with Veo, then add custom text overlays.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <form onSubmit={handleGenerateVideo} className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">1. Generate Video</h2>
                        <div>
                            <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 mb-1">Starting Image</label>
                            <input
                                id="imageUpload"
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleFileChange}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">Video Prompt</label>
                            <input
                                id="prompt"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A cinematic shot of this car driving..."
                                className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                disabled={isLoading || !sourceImage}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
                            <div className="flex space-x-2 rounded-lg bg-slate-100 p-1">
                                {(['16:9', '9:16'] as const).map(ratio => (
                                    <label key={ratio} className="flex-1">
                                        <input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={() => setAspectRatio(ratio)} className="sr-only" />
                                        <div className={`text-center p-2 rounded-md cursor-pointer transition-colors text-sm font-semibold ${aspectRatio === ratio ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>
                                            {ratio === '16:9' ? 'Landscape' : 'Portrait'} ({ratio})
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-400/40"
                            disabled={isLoading || !sourceImage || !prompt}
                        >
                            {isLoading ? (<><LoaderIcon className="h-5 w-5" /><span>Generating Video...</span></>) : (<><SparklesIcon className="h-5 w-5" /><span>Generate Video</span></>)}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Add Text Overlay</h2>
                        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4" disabled={!videoUrl || isLoading || isProcessingOverlay}>
                           <div>
                                <label htmlFor="overlayText" className="block text-sm font-medium text-slate-700 mb-1">Text</label>
                                <input id="overlayText" type="text" value={overlayText} onChange={e => setOverlayText(e.target.value)} className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50" />
                            </div>
                             <div>
                                <label htmlFor="fontFamily" className="block text-sm font-medium text-slate-700 mb-1">Font</label>
                                <select id="fontFamily" value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none disabled:opacity-50">
                                    {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="fontColor" className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                                <input id="fontColor" type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} className="w-full h-10 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-50" />
                            </div>
                             <div>
                                <label htmlFor="fontSizeRange" className="block text-sm font-medium text-slate-700 mb-1">Size ({fontSize}pt)</label>
                                <input id="fontSizeRange" type="range" min="12" max="120" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full disabled:opacity-50" />
                            </div>
                        </fieldset>

                        <fieldset className="mt-4 pt-4 border-t" disabled={!videoUrl || isLoading || isProcessingOverlay}>
                             <legend className="text-sm font-medium text-slate-700 w-full mb-2">Animation Settings</legend>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="animationType" className="block text-sm font-medium text-slate-700 mb-1">Effect</label>
                                    <select id="animationType" value={animationConfig.type} onChange={e => setAnimationConfig(p => ({...p, type: e.target.value as any}))} className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none disabled:opacity-50">
                                        <option value="none">None</option>
                                        <option value="fadeInOut">Fade In/Out</option>
                                        <option value="slide">Slide</option>
                                        <option value="bounce">Bounce</option>
                                        <option value="typewriter">Typewriter</option>
                                    </select>
                                </div>
                                {animationConfig.type === 'slide' && (
                                     <div>
                                        <label htmlFor="animationDirection" className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
                                        <select id="animationDirection" value={animationConfig.direction} onChange={e => setAnimationConfig(p => ({...p, direction: e.target.value as any}))} className="w-full px-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none disabled:opacity-50">
                                            <option value="left">From Left</option>
                                            <option value="right">From Right</option>
                                            <option value="top">From Top</option>
                                            <option value="bottom">From Bottom</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                             {animationConfig.type !== 'none' && (
                                <div className="mt-4">
                                    <label htmlFor="animationSpeed" className="block text-sm font-medium text-slate-700 mb-1">Speed ({animationConfig.speed.toFixed(1)}x)</label>
                                    <input id="animationSpeed" type="range" min="0.5" max="2" step="0.1" value={animationConfig.speed} onChange={e => setAnimationConfig(p => ({...p, speed: parseFloat(e.target.value)}))} className="w-full disabled:opacity-50" />
                                </div>
                            )}
                        </fieldset>

                        <button
                            onClick={applyTextOverlay}
                            className="w-full mt-6 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                             disabled={!videoUrl || isLoading || isProcessingOverlay}
                        >
                             {isProcessingOverlay ? (<><LoaderIcon className="h-5 w-5" /><span>Applying Overlay...</span></>) : (<span>Apply Text Overlay</span>)}
                        </button>
                    </div>
                    {error && <p className="mt-4 text-center text-red-700 bg-red-100 p-3 rounded-lg">{error}</p>}
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center">
                    {isLoading && (
                        <div className="text-center text-slate-500">
                             <LoaderIcon className="w-12 h-12 mx-auto mb-4" />
                             <p className="font-semibold">{loadingMessage}</p>
                             <p className="text-sm mt-1">This can take a few minutes.</p>
                        </div>
                    )}
                    {videoUrl && !isLoading && (
                         <div className="text-center w-full">
                            <h3 className="font-bold text-2xl mb-4 text-slate-700">Your Video is Ready!</h3>
                            <div className="relative">
                                <video key={videoUrl} controls autoPlay loop className="w-full rounded-xl shadow-2xl" >
                                    <source src={videoUrl} type="video/webm" />
                                </video>
                                {isProcessingOverlay && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-xl text-white">
                                        <LoaderIcon className="w-10 h-10"/>
                                        <p className="font-semibold mt-2">Applying text overlay...</p>
                                    </div>
                                )}
                            </div>
                         </div>
                    )}
                    {!videoUrl && !isLoading && (
                         <div className="text-center text-slate-400">
                            <p>Your generated video will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};