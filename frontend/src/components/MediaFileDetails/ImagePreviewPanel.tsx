import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  ZoomInIcon, 
  ZoomOutIcon, 
  RotateCwIcon,
  MaximizeIcon,
  MinimizeIcon,
  BrainIcon,
  EyeIcon,
  RectangleHorizontalIcon as RectangleIcon,
  MousePointerIcon,
  XIcon
} from 'lucide-react';

interface ImagePreviewPanelProps {
  fileData: any;
  previewUrl: string;
  onAIAnnotation: (type: string, options?: any) => void;
}

export const ImagePreviewPanel: React.FC<ImagePreviewPanelProps> = ({
  fileData,
  previewUrl,
  onAIAnnotation
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isDrawingRegion, setIsDrawingRegion] = useState(false);
  const [regionStart, setRegionStart] = useState<{x: number, y: number} | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawRegionOverlay();
  }, [selectedRegion, scale, position, rotation]);

  const drawRegionOverlay = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !selectedRegion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制选择区域
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    const { x, y, width, height } = selectedRegion;
    ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
    
    // 绘制半透明覆盖层
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(x * scale, y * scale, width * scale, height * scale);
    
    ctx.setLineDash([]);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setSelectedRegion(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (showRegionSelector && !isDrawingRegion) {
      // 开始绘制区域
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;
      
      setRegionStart({ x, y });
      setIsDrawingRegion(true);
      setSelectedRegion({ x, y, width: 0, height: 0 });
    } else if (!showRegionSelector) {
      // 拖拽图片
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingRegion && regionStart) {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = (e.clientX - rect.left - position.x) / scale;
      const currentY = (e.clientY - rect.top - position.y) / scale;
      
      setSelectedRegion({
        x: Math.min(regionStart.x, currentX),
        y: Math.min(regionStart.y, currentY),
        width: Math.abs(currentX - regionStart.x),
        height: Math.abs(currentY - regionStart.y)
      });
    } else if (isDragging && !showRegionSelector) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDrawingRegion(false);
    setRegionStart(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleAIAnalysis = () => {
    const options = selectedRegion ? { region: selectedRegion } : {};
    onAIAnnotation('qa', options);
  };

  const handleAICaption = () => {
    const options = selectedRegion ? { region: selectedRegion } : {};
    onAIAnnotation('caption', options);
  };

  const handleObjectDetection = () => {
    onAIAnnotation('object_detection');
  };

  const imageStyle = {
    transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
    cursor: showRegionSelector ? 'crosshair' : (isDragging ? 'grabbing' : 'grab')
  };

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
    : 'h-full bg-gray-50 flex items-center justify-center relative overflow-hidden';

  return (
    <div className={containerClass} ref={containerRef}>
      {/* 工具栏 */}
      <div className={`absolute top-4 left-4 z-10 flex items-center space-x-2 ${isFullscreen ? 'text-white' : ''}`}>
        <Card className="p-2 flex items-center space-x-2">
          <Button size="sm" onClick={handleZoomIn} variant="ghost">
            <ZoomInIcon size={16} />
          </Button>
          <Button size="sm" onClick={handleZoomOut} variant="ghost">
            <ZoomOutIcon size={16} />
          </Button>
          <Button size="sm" onClick={handleRotate} variant="ghost">
            <RotateCwIcon size={16} />
          </Button>
          <Button size="sm" onClick={handleReset} variant="ghost">
            重置
          </Button>
          <Button size="sm" onClick={toggleFullscreen} variant="ghost">
            {isFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
          </Button>
        </Card>
        
        <Card className="p-2 flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => setShowRegionSelector(!showRegionSelector)}
            variant={showRegionSelector ? "default" : "ghost"}
          >
            <RectangleIcon size={16} className="mr-1" />
            区域选择
          </Button>
          {showRegionSelector && (
            <Button size="sm" onClick={() => setSelectedRegion(null)} variant="ghost">
              清除
            </Button>
          )}
        </Card>
      </div>

      {/* AI分析工具栏 */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-2 flex items-center space-x-2">
          <Button size="sm" onClick={handleAIAnalysis} className="bg-blue-500 hover:bg-blue-600">
            <BrainIcon size={16} className="mr-1" />
            AI问答
          </Button>
          <Button size="sm" onClick={handleAICaption} className="bg-green-500 hover:bg-green-600">
            <EyeIcon size={16} className="mr-1" />
            AI描述
          </Button>
          <Button size="sm" onClick={handleObjectDetection} className="bg-purple-500 hover:bg-purple-600">
            <MousePointerIcon size={16} className="mr-1" />
            对象检测
          </Button>
        </Card>
      </div>

      {/* 图片信息栏 */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3">
          <div className="flex items-center space-x-4 text-sm">
            <Badge variant="outline">
              {Math.round(scale * 100)}% 缩放
            </Badge>
            {fileData.image_width && fileData.image_height && (
              <Badge variant="outline">
                {fileData.image_width} × {fileData.image_height}
              </Badge>
            )}
            {fileData.color_mode && (
              <Badge variant="outline">
                {fileData.color_mode}
              </Badge>
            )}
            {selectedRegion && (
              <Badge variant="default">
                选中区域: {Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* 主图像容器 */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {previewUrl && (
          <>
            <img
              ref={imageRef}
              src={previewUrl}
              alt={fileData.filename}
              style={imageStyle}
              className="max-w-none select-none"
              draggable={false}
              onLoad={() => {
                // 设置画布尺寸
                const canvas = canvasRef.current;
                const image = imageRef.current;
                if (canvas && image) {
                  canvas.width = image.naturalWidth;
                  canvas.height = image.naturalHeight;
                  canvas.style.width = `${image.offsetWidth}px`;
                  canvas.style.height = `${image.offsetHeight}px`;
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                transformOrigin: 'center center',
                marginLeft: '-50%',
                marginTop: '-50%'
              }}
            />
          </>
        )}
        
        {!previewUrl && (
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-64 h-48 bg-gray-200 rounded-lg mb-4"></div>
            </div>
            <p className="text-gray-500">正在加载图片预览...</p>
          </div>
        )}
      </div>

      {/* 操作提示 */}
      {showRegionSelector && (
        <div className="absolute bottom-4 right-4 z-10">
          <Card className="p-3">
            <p className="text-sm text-gray-600">
              {isDrawingRegion ? '拖拽以选择区域' : '点击并拖拽以选择分析区域'}
            </p>
          </Card>
        </div>
      )}

      {/* 全屏模式退出按钮 */}
      {isFullscreen && (
        <Button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-20"
          variant="secondary"
        >
          <XIcon size={16} className="mr-1" />
          退出全屏
        </Button>
      )}
    </div>
  );
};