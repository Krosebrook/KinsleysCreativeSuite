import React, { useState, useEffect, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { LoaderIcon, SparklesIcon, ImageIcon, XIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from './icons';

// Fix: Removed local AIStudio interface and window augmentation.
// This is now defined globally in `types.ts` to resolve a TypeScript declaration conflict.

interface TextOverlay {
  id: number;
  text: string;
  // Enhanced styling properties for independent control
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  x: number; // Position percentage
  y: number; // Position percentage
  animation: 'none' | 'fadeInOut' | 'slide' | 'bounce' | 'typewriter';
  animationSpeed: number;
  animationDirection: 'left' | 'right' | 'up' | 'down';
  backgroundShape: 'none' | 'rectangle' | 'rounded-rectangle';
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
}

const defaultTextOverlay: Omit<TextOverlay, 'id'> = {
  text: 'Hello, World!',
  fontFamily: 'Arial',
  fontSize: 48,
  fontColor: '#FFFFFF',
  textAlign: 'center',
  x: 50,
  y: 50,
  animation: 'fadeInOut',
  animationSpeed: 1,
  animationDirection: 'up',
  backgroundShape: 'none',
  backgroundColor: '#000000',
  backgroundOpacity: 0.5,
  backgroundPadding: 10,
};

interface VideoGeneratorProps {
    initialImage?: { b64: string; file: File } | null;
}

const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(0, 0, 0, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ initialImage }) => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
    const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('A cinematic, dramatic shot of a cat looking out a window at a rainy city.');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);

    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);


    const checkApiKey = async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        } else {
            setApiKeySelected(true);
        }
    };

    useEffect(() => {
        checkApiKey();
    }, []);

    useEffect(() => {
        if (initialImage) {
            setSourceImageFile(initialImage.file);
            const dataUrl = `data:${initialImage.file.type};base64,${initialImage.b64}`;
            setSourceImageUrl(dataUrl);
            setGeneratedVideoUrl(null);
            setProcessedVideoUrl(null);
            setError(null);
        }
    }, [initialImage]);
    
    useEffect(() => {
        return () => {
            if (sourceImageUrl && sourceImageUrl.startsWith('blob:')) URL.revokeObjectURL(sourceImageUrl);
            if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
            if (processedVideoUrl) URL.revokeObjectURL(processedVideoUrl);
        };
    }, [sourceImageUrl, generatedVideoUrl, processedVideoUrl]);

    // Live preview effect
    useEffect(() => {
        drawTextPreview();
    }, [textOverlays, selectedTextIndex, sourceImageUrl, generatedVideoUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setSourceImageFile(selectedFile);
            setGeneratedVideoUrl(null);
            setProcessedVideoUrl(null);
            setError(null);
            if (sourceImageUrl && sourceImageUrl.startsWith('blob:')) URL.revokeObjectURL(sourceImageUrl);
            setSourceImageUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleApiKeySelect = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                setApiKeySelected(true);
                setError(null);
            } catch (e) {
                console.error("Error opening API key selection:", e);
                setError("Could not open the API key selection dialog.");
            }
        }
    };
    
    const handleGenerateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceImageFile || isLoading) return;

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);
        setProcessedVideoUrl(null);
        setProgressMessage('Preparing to generate video...');

        try {
            const base64Data = await fileToBase64(sourceImageFile);
            const resultUrl = await generateVideo(
                base64Data,
                sourceImageFile.type,
                prompt,
                aspectRatio,
                (message) => setProgressMessage(message)
            );
            setGeneratedVideoUrl(resultUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            if (errorMessage.toLowerCase().includes('re-select your api key')) {
                setApiKeySelected(false);
            }
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };

    // Text Overlay Functions
    const addTextOverlay = () => {
        const newOverlay: TextOverlay = { ...defaultTextOverlay, id: Date.now() };
        setTextOverlays([...textOverlays, newOverlay]);
        setSelectedTextIndex(textOverlays.length);
    };

    const handleTextOverlayChange = (index: number, newProps: Partial<TextOverlay>) => {
        setTextOverlays(current =>
            current.map((overlay, i) => (i === index ? { ...overlay, ...newProps } : overlay))
        );
    };
    
    const removeTextOverlay = (index: number) => {
        setTextOverlays(current => current.filter((_, i) => i !== index));
        setSelectedTextIndex(null);
    };

    const reorderTextOverlay = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= textOverlays.length) return;
        const newOverlays = [...textOverlays];
        const temp = newOverlays[index];
        newOverlays[index] = newOverlays[newIndex];
        newOverlays[newIndex] = temp;
        setTextOverlays(newOverlays);
        setSelectedTextIndex(newIndex);
    };

    const drawTextOnCanvas = (ctx: CanvasRenderingContext2D, overlay: TextOverlay, progress: number, canvasWidth: number, canvasHeight: number) => {
        // Use new independent style properties
        ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`;
        ctx.fillStyle = overlay.fontColor;
        ctx.textAlign = overlay.textAlign;
        ctx.textBaseline = 'middle';

        let x = (overlay.x / 100) * canvasWidth;
        let y = (overlay.y / 100) * canvasHeight;
        let opacity = 1;
        let textToShow = overlay.text;
        
        const speedFactor = 1 / (overlay.animationSpeed || 1);
        const duration = 0.2; // 20% of video for fade in/out or other intro animations
        const animationProgress = Math.min(progress / (duration * speedFactor), 1);

        // Animation logic
        if (overlay.animation === 'fadeInOut') {
            const fadeDuration = duration * speedFactor;
            if (progress < fadeDuration) opacity = progress / fadeDuration;
            else if (progress > 1 - fadeDuration) opacity = (1 - progress) / fadeDuration;
        } else if (overlay.animation === 'slide') {
            const easedProgress = 1 - Math.pow(1 - animationProgress, 3); // Ease out
            let slideAmount = canvasWidth * (1 - easedProgress);
            if (overlay.animationDirection === 'left') x -= slideAmount;
            else if (overlay.animationDirection === 'right') x += slideAmount;
            else if (overlay.animationDirection === 'up') y += canvasHeight * (1-easedProgress);
            else if (overlay.animationDirection === 'down') y -= canvasHeight * (1-easedProgress);
        } else if (overlay.animation === 'bounce') {
            const bounceHeight = 30 * Math.sin(animationProgress * Math.PI);
            y -= bounceHeight;
        } else if (overlay.animation === 'typewriter') {
            const totalDuration = (1 - duration) * speedFactor;
            const textProgress = Math.min(progress / totalDuration, 1);
            const textLength = Math.floor(overlay.text.length * textProgress);
            textToShow = overlay.text.substring(0, textLength);
        }

        ctx.globalAlpha = opacity;
        
        // --- Background Drawing Logic ---
        if (overlay.backgroundShape !== 'none') {
            const metrics = ctx.measureText(textToShow);
            const padding = overlay.backgroundPadding;
            const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            
            const bgWidth = metrics.width + padding * 2;
            const bgHeight = textHeight + padding * 2;
            
            // Adjust background position based on text alignment
            let bgX;
            if (overlay.textAlign === 'center') {
                bgX = x - bgWidth / 2;
            } else if (overlay.textAlign === 'left') {
                bgX = x - padding;
            } else { // right
                bgX = x - bgWidth + padding;
            }
            const bgY = y - bgHeight / 2;

            ctx.fillStyle = hexToRgba(overlay.backgroundColor, overlay.backgroundOpacity);

            ctx.beginPath();
            if (overlay.backgroundShape === 'rounded-rectangle') {
                const cornerRadius = Math.min(20, bgWidth / 2, bgHeight / 2);
                ctx.roundRect(bgX, bgY, bgWidth, bgHeight, cornerRadius);
            } else { // rectangle
                ctx.rect(bgX, bgY, bgWidth, bgHeight);
            }
            ctx.fill();
        }
        
        // --- Text Drawing ---
        ctx.fillStyle = overlay.fontColor; // Set fillStyle again as background might have changed it
        ctx.fillText(textToShow, x, y);

        // Reset alpha for next overlay
        ctx.globalAlpha = 1;
    };
    
    const drawTextPreview = () => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.drawImage(image, 0, 0);
            textOverlays.forEach(overlay => {
                // For preview, show the text in its "settled" state (progress > animation duration)
                drawTextOnCanvas(ctx, overlay, 0.5, canvas.width, canvas.height);
            });
            if (selectedTextIndex !== null && textOverlays[selectedTextIndex]) {
                 // Highlight selected overlay
                const overlay = textOverlays[selectedTextIndex];
                const x = (overlay.x / 100) * canvas.width;
                const y = (overlay.y / 100) * canvas.height;
                ctx.strokeStyle = 'rgba(79, 70, 229, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 20, y - 20, 40, 40);
            }
        };

        if(generatedVideoUrl) {
            // This is a bit of a hack for preview on video. It just grabs the first frame.
            const video = document.createElement('video');
            video.src = generatedVideoUrl;
            video.crossOrigin = "anonymous";
            video.onloadeddata = () => {
                image.src = canvas.toDataURL(); // Fallback, but the video frame should draw
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                textOverlays.forEach(overlay => {
                    drawTextOnCanvas(ctx, overlay, 0.5, canvas.width, canvas.height);
                });
            };
            return; // Exit early to avoid setting image.src twice
        }
        
        image.src = sourceImageUrl || '';
    };

    const handleApplyTextOverlays = async () => {
        if (!generatedVideoUrl) {
            setError('Please generate a video first.');
            return;
        }

        setIsLoading(true);
        setProgressMessage('Applying text overlays...');

        try {
            const videoEl = document.createElement('video');
            videoEl.src = generatedVideoUrl;
            videoEl.crossOrigin = "anonymous";
            
            await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });

            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            const stream = canvas.captureStream();
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const chunks: Blob[] = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            
            recorder.start();

            const duration = videoEl.duration;
            const frameRate = 30;
            for (let i = 0; i < duration * frameRate; i++) {
                videoEl.currentTime = i / frameRate;
                await new Promise(r => videoEl.onseeked = r);
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                const progress = (i / frameRate) / duration;
                textOverlays.forEach(overlay => {
                    drawTextOnCanvas(ctx, overlay, progress, canvas.width, canvas.height);
                });
            }
            
            recorder.stop();

            await new Promise(resolve => { recorder.onstop = resolve; });

            const blob = new Blob(chunks, { type: 'video/webm' });
            setProcessedVideoUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to process video with text.");
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };

    const renderTextOverlayControls = () => {
        if (selectedTextIndex === null || !textOverlays[selectedTextIndex]) return null;
        
        const overlay = textOverlays[selectedTextIndex];
        const handleChange = (props: Partial<TextOverlay>) => handleTextOverlayChange(selectedTextIndex, props);

        return (
            <div className="space-y-4">
                <h3 className="text-lg font-bold">Editing Text Layer {selectedTextIndex + 1}</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Text</label>
                    <input type="text" value={overlay.text} onChange={e => handleChange({ text: e.target.value })} className="mt-1 w-full input-style" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Font</label>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                        <select value={overlay.fontFamily} onChange={e => handleChange({ fontFamily: e.target.value })} className="w-full input-style">
                            <option>Arial</option><option>Verdana</option><option>Times New Roman</option><option>Courier New</option><option>Georgia</option><option>Impact</option><option>Comic Sans MS</option>
                        </select>
                        <input type="color" value={overlay.fontColor} onChange={e => handleChange({ fontColor: e.target.value })} className="w-full h-10 p-1 bg-white border border-slate-300 rounded-md" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Size: {overlay.fontSize}px</label>
                    <input type="range" min="10" max="200" value={overlay.fontSize} onChange={e => handleChange({ fontSize: Number(e.target.value) })} className="mt-1 w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Alignment</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        <button onClick={() => handleChange({ textAlign: 'left' })} className={`p-2 rounded-lg transition-colors ${overlay.textAlign === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}><AlignLeftIcon className="w-5 h-5 mx-auto" /></button>
                        <button onClick={() => handleChange({ textAlign: 'center' })} className={`p-2 rounded-lg transition-colors ${overlay.textAlign === 'center' ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}><AlignCenterIcon className="w-5 h-5 mx-auto" /></button>
                        <button onClick={() => handleChange({ textAlign: 'right' })} className={`p-2 rounded-lg transition-colors ${overlay.textAlign === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}><AlignRightIcon className="w-5 h-5 mx-auto" /></button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Position (X: {overlay.x}%, Y: {overlay.y}%)</label>
                    <div className="relative">
                         <div className="w-full h-32 bg-slate-200 rounded-lg mt-1 cursor-crosshair" onClick={(e) => {
                             const rect = e.currentTarget.getBoundingClientRect();
                             const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                             const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                             handleChange({ x, y });
                         }}>
                             <div className="absolute w-4 h-4 bg-indigo-600 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2" style={{ left: `${overlay.x}%`, top: `${overlay.y}%` }}></div>
                         </div>
                    </div>
                </div>
                
                 <fieldset className="border-t pt-4 mt-4">
                    <legend className="text-sm font-medium text-slate-600">Animation</legend>
                    <div className="space-y-3 mt-2">
                        <select value={overlay.animation} onChange={e => handleChange({ animation: e.target.value as TextOverlay['animation'] })} className="w-full input-style">
                            <option value="none">None</option><option value="fadeInOut">Fade In/Out</option><option value="slide">Slide In</option><option value="bounce">Bounce</option><option value="typewriter">Typewriter</option>
                        </select>
                        {overlay.animation !== 'none' && (
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Speed: {overlay.animationSpeed}x</label>
                                <input type="range" min="0.5" max="2" step="0.1" value={overlay.animationSpeed} onChange={e => handleChange({ animationSpeed: Number(e.target.value) })} className="w-full" />
                             </div>
                        )}
                        {overlay.animation === 'slide' && (
                             <select value={overlay.animationDirection} onChange={e => handleChange({ animationDirection: e.target.value as TextOverlay['animationDirection'] })} className="w-full input-style">
                                <option value="up">From Bottom</option><option value="down">From Top</option><option value="left">From Left</option><option value="right">From Right</option>
                            </select>
                        )}
                    </div>
                </fieldset>
                
                <fieldset className="border-t pt-4 mt-4">
                    <legend className="text-sm font-medium text-slate-600">Background</legend>
                    <div className="space-y-3 mt-2">
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Shape</label>
                            <select value={overlay.backgroundShape} onChange={e => handleChange({ backgroundShape: e.target.value as TextOverlay['backgroundShape'] })} className="w-full input-style">
                                <option value="none">None</option>
                                <option value="rectangle">Rectangle</option>
                                <option value="rounded-rectangle">Rounded Rectangle</option>
                            </select>
                        </div>
                        {overlay.backgroundShape !== 'none' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700">BG Color</label>
                                        <input type="color" value={overlay.backgroundColor} onChange={e => handleChange({ backgroundColor: e.target.value })} className="mt-1 w-full h-10 p-1 bg-white border border-slate-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Padding</label>
                                        <input type="number" min="0" max="50" value={overlay.backgroundPadding} onChange={e => handleChange({ backgroundPadding: Number(e.target.value) })} className="mt-1 w-full input-style" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Opacity: {overlay.backgroundOpacity}</label>
                                    <input type="range" min="0" max="1" step="0.1" value={overlay.backgroundOpacity} onChange={e => handleChange({ backgroundOpacity: Number(e.target.value) })} className="w-full" />
                                </div>
                            </>
                        )}
                    </div>
                </fieldset>

            </div>
        );
    };

    const renderApiKeyScreen = () => (
        <div className="text-center p-8 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-amber-800 mb-2">API Key Required</h3>
            <p className="text-amber-700 mb-4">
                Video generation requires a project-linked API key. Please select your key.
                Info on billing: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">Google's docs</a>.
            </p>
            <button onClick={handleApiKeySelect} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition shadow-md">
                Select API Key
            </button>
            {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
    );
    
    const finalVideoUrl = processedVideoUrl || generatedVideoUrl;

    return (
        <>
            <style>{`.input-style { background-color: #f1f5f9; border-radius: 0.5rem; padding: 0.5rem 1rem; width: 100%; border: 1px solid #e2e8f0; } .input-style:focus { outline: none; ring: 2px; ring-color: #6366f1; }`}</style>
            <header className="text-center mb-10 md:mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">AI Video Generator</h1>
                <p className="mt-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                    Bring images to life. Turn a photo into a dynamic video with a prompt, then add custom text overlays.
                </p>
            </header>
            
            {!apiKeySelected ? renderApiKeyScreen() : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Left Column: Controls */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">1. Generate Base Video</h2>
                        <form onSubmit={handleGenerateVideo} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Starting Image</label>
                                <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" disabled={isLoading} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Animation Prompt</label>
                                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full input-style" disabled={isLoading} required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
                                <div className="flex space-x-4">
                                    {(['16:9', '9:16'] as const).map(ratio => (
                                        <label key={ratio} className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={() => setAspectRatio(ratio)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" disabled={isLoading}/><span>{ratio === '16:9' ? 'Landscape' : 'Portrait'}</span></label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform hover:scale-105 disabled:bg-slate-300 flex items-center justify-center space-x-2 shadow-lg" disabled={isLoading || !sourceImageFile}>
                                {isLoading && !progressMessage.includes('Applying') ? (<><LoaderIcon className="h-5 w-5" /><span>Generating...</span></>) : (<><SparklesIcon className="h-5 w-5" /><span>Generate Video</span></>)}
                            </button>
                        </form>
                        
                        <div className="border-t pt-6 space-y-4">
                             <h2 className="text-2xl font-bold text-slate-800">2. Add Text Overlays</h2>
                             {textOverlays.map((overlay, index) => (
                                <div key={overlay.id} className={`flex items-center space-x-2 p-2 rounded-lg ${selectedTextIndex === index ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                    <button onClick={() => setSelectedTextIndex(index)} className="flex-grow text-left truncate font-medium">{overlay.text}</button>
                                    <button onClick={() => reorderTextOverlay(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUpIcon className="w-4 h-4" /></button>
                                    <button onClick={() => reorderTextOverlay(index, 'down')} disabled={index === textOverlays.length - 1} className="p-1 disabled:opacity-30"><ArrowDownIcon className="w-4 h-4" /></button>
                                    <button onClick={() => removeTextOverlay(index)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                             ))}
                             <button onClick={addTextOverlay} className="w-full bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 transition">Add Text</button>
                             {selectedTextIndex !== null && <div className="p-4 bg-slate-50 rounded-lg">{renderTextOverlayControls()}</div>}
                             <button onClick={handleApplyTextOverlays} disabled={isLoading || !generatedVideoUrl || textOverlays.length === 0} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-300 flex items-center justify-center space-x-2 shadow-lg">
                                {isLoading && progressMessage.includes('Applying') ? (<><LoaderIcon className="h-5 w-5" /><span>Applying...</span></>) : "Apply Overlays"}
                            </button>
                        </div>
                    </div>
                    
                    {/* Right Column: Preview/Result */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[500px]">
                        {isLoading ? (
                            <div className="text-center text-slate-500"><LoaderIcon className="w-12 h-12 mx-auto mb-4" /><p className="font-semibold">{progressMessage}</p><p className="text-sm mt-2 max-w-xs">{!progressMessage.includes('Applying') && "Video generation can take several minutes."}</p></div>
                        ) : error ? (
                            <div className="w-full p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg"><div className="flex justify-between items-start"><div><p className="font-bold text-lg">Error</p><p className="mt-1 text-sm">{error}</p></div><button onClick={() => setError(null)} className="-mt-1 -mr-1 p-1 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5" /></button></div></div>
                        ) : finalVideoUrl ? (
                             <div className="w-full text-center">
                                <h3 className="text-2xl font-bold text-slate-800 mb-4">{processedVideoUrl ? 'Final Video with Overlays' : 'Generated Video'}</h3>
                                <video key={finalVideoUrl} src={finalVideoUrl} controls autoPlay loop className="w-full rounded-lg shadow-md" />
                                <a href={finalVideoUrl} download={`gemini-video-${Date.now()}.webm`} className="inline-block mt-4 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition">Download Video</a>
                            </div>
                        ) : (sourceImageUrl || generatedVideoUrl) ? (
                            <div className="w-full text-center">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Live Preview</h3>
                                <canvas ref={previewCanvasRef} className="max-w-full max-h-96 object-contain rounded-lg shadow-md" />
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 flex flex-col items-center"><ImageIcon className="w-16 h-16 mb-4" /><p className="text-lg font-semibold">Upload an image to animate</p><p className="text-sm">Your generated video will appear here.</p></div>
                        )}
                    </div>
                 </div>
            )}
        </>
    );
};