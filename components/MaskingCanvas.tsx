import React, { useRef, useEffect, useState } from 'react';
import { PencilIcon, EraserIcon, XIcon, CheckIcon } from './icons';

interface MaskingCanvasProps {
  baseImageB64: string;
  onClose: () => void;
  onSave: (maskB64: string) => void;
}

type Tool = 'pencil' | 'eraser';

export const MaskingCanvas: React.FC<MaskingCanvasProps> = ({ baseImageB64, onClose, onSave }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pencil');
    const [lineWidth, setLineWidth] = useState(40);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        if (image && canvas) {
            const setCanvasSize = () => {
                const { naturalWidth, naturalHeight } = image;
                canvas.width = naturalWidth;
                canvas.height = naturalHeight;
            };
            image.onload = setCanvasSize;
            if (image.complete) {
                setCanvasSize();
            }
        }
    }, [baseImageB64]);
    
    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        const coords = getCoords(e);
        lastPointRef.current = coords;
        draw(e);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !lastPointRef.current) return;
        e.preventDefault();
        const currentPoint = getCoords(e);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Semi-transparent red
        ctx.globalCompositeOperation = tool === 'pencil' ? 'source-over' : 'destination-out';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        lastPointRef.current = currentPoint;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPointRef.current = null;
    };

    const handleSave = () => {
        const sourceCanvas = canvasRef.current;
        const image = imageRef.current;
        if (!sourceCanvas || !image) return;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = image.naturalWidth;
        maskCanvas.height = image.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (!maskCtx) return;

        maskCtx.drawImage(sourceCanvas, 0, 0);
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 0) { // Drawn pixel
                data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
            } else { // Transparent pixel
                data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
            }
        }
        maskCtx.putImageData(imageData, 0, 0);
        onSave(maskCanvas.toDataURL('image/png').split(',')[1]);
    };

    const ToolButton: React.FC<{ currentTool: Tool, targetTool: Tool, children: React.ReactNode, onClick: () => void }> = ({ currentTool, targetTool, children, onClick }) => (
        <button onClick={onClick} className={`p-3 rounded-lg transition-colors ${currentTool === targetTool ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'}`}>{children}</button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">Create Mask</h3>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-4">Draw over the area you want the AI to edit.</p>
                <div className="flex flex-wrap items-center justify-center gap-4 mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-xl shadow-sm">
                    <div className="flex space-x-2">
                        <ToolButton currentTool={tool} targetTool="pencil" onClick={() => setTool('pencil')}><PencilIcon className="w-5 h-5" /></ToolButton>
                        <ToolButton currentTool={tool} targetTool="eraser" onClick={() => setTool('eraser')}><EraserIcon className="w-5 h-5" /></ToolButton>
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="lineWidth" className="text-sm font-medium text-slate-600 dark:text-slate-300">Brush Size</label>
                        <input id="lineWidth" type="range" min="5" max="150" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-32" />
                    </div>
                </div>
                <div className="relative w-full max-h-[60vh] flex justify-center items-center overflow-hidden bg-slate-200 dark:bg-slate-900 rounded-lg">
                    <img ref={imageRef} src={`data:image/png;base64,${baseImageB64}`} alt="Image to mask" className="max-w-full max-h-full object-contain" />
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                </div>
                <div className="flex justify-center space-x-4 mt-6">
                    <button onClick={onClose} className="flex-1 max-w-xs flex items-center justify-center space-x-2 bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition shadow-md"><XIcon className="h-5 w-5" /><span>Cancel</span></button>
                    <button onClick={handleSave} className="flex-1 max-w-xs flex items-center justify-center space-x-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition shadow-md"><CheckIcon className="h-5 w-5" /><span>Save Mask</span></button>
                </div>
            </div>
        </div>
    );
};
