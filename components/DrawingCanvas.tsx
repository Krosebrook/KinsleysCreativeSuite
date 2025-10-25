import React, { useRef, useEffect, useState } from 'react';
import { PencilIcon, EraserIcon } from './icons';

interface DrawingCanvasProps {
  initialImageB64: string;
  width: number;
  height: number;
}

type Tool = 'pencil' | 'eraser';

export const DrawingCanvas = React.forwardRef<HTMLCanvasElement, DrawingCanvasProps>(
  ({ initialImageB64, width, height }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pencil');
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(5);

    // Expose the internal canvas ref to the parent component
    React.useImperativeHandle(ref, () => internalCanvasRef.current!, []);

    useEffect(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const image = new Image();
      image.src = `data:image/png;base64,${initialImageB64}`;
      image.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
      };
    }, [initialImageB64, width, height]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = internalCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      setIsDrawing(true);
      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = internalCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;
      
      e.preventDefault();

      ctx.globalCompositeOperation = tool === 'pencil' ? 'source-over' : 'destination-out';
      ctx.strokeStyle = tool === 'pencil' ? color : 'rgba(0,0,0,1)';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const { x, y } = getCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      const canvas = internalCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.closePath();
      setIsDrawing(false);
    };
    
    const ToolButton: React.FC<{ currentTool: Tool, targetTool: Tool, children: React.ReactNode, onClick: () => void }> = ({ currentTool, targetTool, children, onClick }) => (
        <button
            onClick={onClick}
            aria-label={`Select ${targetTool} tool`}
            className={`p-3 rounded-lg transition-colors ${currentTool === targetTool ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'}`}
        >
            {children}
        </button>
    );

    return (
      <div className="flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-xl shadow-sm">
            <div className="flex space-x-2">
                <ToolButton currentTool={tool} targetTool="pencil" onClick={() => setTool('pencil')}><PencilIcon className="w-5 h-5" /></ToolButton>
                <ToolButton currentTool={tool} targetTool="eraser" onClick={() => setTool('eraser')}><EraserIcon className="w-5 h-5" /></ToolButton>
            </div>
            <div className="flex items-center space-x-2">
                <label htmlFor="colorPicker" className="text-sm font-medium text-slate-600 dark:text-slate-300">Color</label>
                <input
                    id="colorPicker"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={tool !== 'pencil'}
                    className="w-10 h-10 p-1 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
             <div className="flex items-center space-x-2">
                <label htmlFor="lineWidth" className="text-sm font-medium text-slate-600 dark:text-slate-300">Size</label>
                <input
                    id="lineWidth"
                    type="range"
                    min="1"
                    max="50"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-32"
                />
            </div>
        </div>
        <canvas
          ref={internalCanvasRef}
          width={width}
          height={height}
          className="bg-white border border-slate-300 dark:border-slate-600 rounded-lg cursor-crosshair max-w-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    );
  }
);
