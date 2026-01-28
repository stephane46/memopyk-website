import { useState, useRef, useCallback } from 'react';
import { Move, RotateCw, ZoomIn, ZoomOut, Download, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Position {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface ImagePositionSelectorProps {
  imageSrc: string;
  onPositionChange: (position: Position) => void;
  onImageGenerate: (canvas: HTMLCanvasElement) => void;
  className?: string;
  aspectRatio?: '16:9' | '1:1' | '4:3' | '9:16';
  outputWidth?: number;
  outputHeight?: number;
}

export const ImagePositionSelector = ({
  imageSrc,
  onPositionChange,
  onImageGenerate,
  className,
  aspectRatio = '16:9',
  outputWidth = 1920,
  outputHeight = 1080
}: ImagePositionSelectorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState<Position>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const aspectRatios = {
    '16:9': 16 / 9,
    '1:1': 1,
    '4:3': 4 / 3,
    '9:16': 9 / 16
  };

  const updatePosition = useCallback((newPosition: Position) => {
    setPosition(newPosition);
    onPositionChange(newPosition);
  }, [onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newPosition = {
      ...position,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    updatePosition(newPosition);
  }, [isDragging, dragStart, position, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.1, Math.min(3, position.scale + delta));
    updatePosition({ ...position, scale: newScale });
  };

  const resetPosition = () => {
    updatePosition({ x: 0, y: 0, scale: 1, rotation: 0 });
  };

  const rotateImage = (degrees: number) => {
    updatePosition({ ...position, rotation: position.rotation + degrees });
  };

  const generateStaticImage = async () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to output dimensions
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Save context for transformations
    ctx.save();

    // Calculate center point
    const centerX = outputWidth / 2;
    const centerY = outputHeight / 2;

    // Apply transformations
    ctx.translate(centerX + position.x, centerY + position.y);
    ctx.rotate((position.rotation * Math.PI) / 180);
    ctx.scale(position.scale, position.scale);

    // Draw image centered
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    ctx.drawImage(
      image,
      -imageWidth / 2,
      -imageHeight / 2,
      imageWidth,
      imageHeight
    );

    // Restore context
    ctx.restore();

    onImageGenerate(canvas);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    generateStaticImage();
    
    // Create download link
    const link = document.createElement('a');
    link.download = `memopyk-static-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={() => {}}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
              <SelectItem value="4:3">4:3 (Standard)</SelectItem>
              <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Scale: {position.scale.toFixed(2)}</Label>
          <Input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={position.scale}
            onChange={(e) => updatePosition({ ...position, scale: parseFloat(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>Rotation: {position.rotation}°</Label>
          <Input
            type="range"
            min="0"
            max="360"
            step="15"
            value={position.rotation}
            onChange={(e) => updatePosition({ ...position, rotation: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>Actions</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetPosition}>
              Reset
            </Button>
            <Button size="sm" variant="outline" onClick={() => rotateImage(90)}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div 
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden cursor-move"
        style={{ 
          aspectRatio: aspectRatios[aspectRatio],
          height: '400px'
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onMouseMove={isDragging ? (e) => handleMouseMove(e.nativeEvent) : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Position selector preview"
          className="absolute pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${position.scale}) rotate(${position.rotation}deg)`,
            transformOrigin: 'center',
            left: '50%',
            top: '50%',
            marginLeft: '-50%',
            marginTop: '-50%'
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
        />
        
        {/* Overlay instructions */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white/70 text-center space-y-2">
            <Move className="h-8 w-8 mx-auto" />
            <p className="text-sm">Drag to move • Scroll to zoom</p>
          </div>
        </div>

        {/* Grid overlay for positioning help */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Position Info & Generate */}
      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Position: X({position.x.toFixed(0)}) Y({position.y.toFixed(0)})</p>
          <p>Output: {outputWidth} × {outputHeight}px</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={generateStaticImage} disabled={!imageLoaded}>
            <Upload className="h-4 w-4 mr-2" />
            Generate
          </Button>
          <Button onClick={downloadImage} variant="outline" disabled={!imageLoaded}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Hidden canvas for image generation */}
      <canvas
        ref={canvasRef}
        className="hidden"
        width={outputWidth}
        height={outputHeight}
      />
    </div>
  );
};