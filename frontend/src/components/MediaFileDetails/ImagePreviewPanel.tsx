import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
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
  XIcon,
  TagIcon,
  SaveIcon
} from 'lucide-react';

interface Annotation {
  id: string;
  region: { x: number; y: number; width: number; height: number };
  label: string;
  type: 'manual' | 'ai';
  timestamp: number;
}

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
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [imageNaturalSize, setImageNaturalSize] = useState<{width: number, height: number} | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawRegionOverlay();
  }, [selectedRegion, annotations, scale, position, rotation, imageNaturalSize]);

  const drawRegionOverlay = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageNaturalSize) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算图像在canvas中的实际显示尺寸和位置
    const imageRect = image.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect(); 
    const scaleX = canvas.width / imageNaturalSize.width;
    const scaleY = canvas.height / imageNaturalSize.height;
    
    // 绘制当前选择区域
    if (selectedRegion) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const { x, y, width, height } = selectedRegion;
      ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
      
      ctx.setLineDash([]);
    }
    
    // 绘制已保存的标注
    annotations.forEach((annotation, index) => {
      const { x, y, width, height } = annotation.region;
      
      // 根据标注类型设置颜色
      const color = annotation.type === 'ai' ? '#10b981' : '#f59e0b';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
      
      // 绘制标签背景
      ctx.fillStyle = color;
      const labelY = y * scaleY - 20;
      const textWidth = ctx.measureText(annotation.label).width + 8;
      ctx.fillRect(x * scaleX, labelY, textWidth, 16);
      
      // 绘制标签文字
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.fillText(annotation.label, x * scaleX + 4, labelY + 12);
    });
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

  const getImageCoordinates = (clientX: number, clientY: number) => {
    const image = imageRef.current;
    if (!image || !imageNaturalSize) return null;
    
    const imageRect = image.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return null;
    
    // 计算鼠标相对于图像的位置
    const relativeX = clientX - imageRect.left;
    const relativeY = clientY - imageRect.top;
    
    // 转换为图像原始坐标
    const scaleX = imageNaturalSize.width / imageRect.width;
    const scaleY = imageNaturalSize.height / imageRect.height;
    
    const x = relativeX * scaleX;
    const y = relativeY * scaleY;
    
    // 确保坐标在图像范围内
    return {
      x: Math.max(0, Math.min(imageNaturalSize.width, x)),
      y: Math.max(0, Math.min(imageNaturalSize.height, y))
    };
  };

  const handleSaveAnnotation = () => {
    if (!selectedRegion || !annotationLabel.trim()) return;
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      region: selectedRegion,
      label: annotationLabel.trim(),
      type: 'manual',
      timestamp: Date.now()
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedRegion(null);
    setAnnotationLabel('');
    setShowAnnotationDialog(false);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const handleCancelAnnotation = () => {
    setSelectedRegion(null);
    setAnnotationLabel('');
    setShowAnnotationDialog(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (showRegionSelector && !isDrawingRegion) {
      const coords = getImageCoordinates(e.clientX, e.clientY);
      if (!coords) return;
      
      setRegionStart(coords);
      setIsDrawingRegion(true);
      setSelectedRegion({ x: coords.x, y: coords.y, width: 0, height: 0 });
    } else if (!showRegionSelector) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingRegion && regionStart) {
      const coords = getImageCoordinates(e.clientX, e.clientY);
      if (!coords) return;
      
      setSelectedRegion({
        x: Math.min(regionStart.x, coords.x),
        y: Math.min(regionStart.y, coords.y),
        width: Math.abs(coords.x - regionStart.x),
        height: Math.abs(coords.y - regionStart.y)
      });
    } else if (isDragging && !showRegionSelector) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawingRegion && selectedRegion && selectedRegion.width > 5 && selectedRegion.height > 5) {
      // 区域足够大，显示标注对话框
      setShowAnnotationDialog(true);
    }
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
          <div 
            className="relative"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              ref={imageRef}
              src={previewUrl}
              alt={fileData.filename}
              style={{
                cursor: showRegionSelector ? 'crosshair' : (isDragging ? 'grabbing' : 'grab')
              }}
              className="max-w-none select-none block"
              draggable={false}
              onLoad={(e) => {
                const image = e.currentTarget;
                const canvas = canvasRef.current;
                if (canvas) {
                  const { naturalWidth, naturalHeight, offsetWidth, offsetHeight } = image;
                  setImageNaturalSize({
                    width: naturalWidth,
                    height: naturalHeight
                  });
                  canvas.width = naturalWidth;
                  canvas.height = naturalHeight;
                  canvas.style.width = `${offsetWidth}px`;
                  canvas.style.height = `${offsetHeight}px`;
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
            />
          </div>
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

      {/* 标注对话框 */}
      {showAnnotationDialog && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TagIcon size={20} className="mr-2" />
              添加标注
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">标签名称</label>
                <Input
                  placeholder="输入标注标签..."
                  value={annotationLabel}
                  onChange={(e) => setAnnotationLabel(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && annotationLabel.trim()) {
                      handleSaveAnnotation();
                    }
                  }}
                  autoFocus
                />
              </div>
              {selectedRegion && (
                <div className="text-sm text-gray-600">
                  区域大小: {Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancelAnnotation}>
                  取消
                </Button>
                <Button 
                  onClick={handleSaveAnnotation}
                  disabled={!annotationLabel.trim()}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <SaveIcon size={16} className="mr-1" />
                  保存
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 标注列表 */}
      {annotations.length > 0 && (
        <div className="absolute top-20 left-4 z-10 max-w-xs">
          <Card className="p-3">
            <h4 className="font-medium mb-2 flex items-center">
              <TagIcon size={16} className="mr-1" />
              标注列表 ({annotations.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {annotations.map((annotation) => (
                <div 
                  key={annotation.id} 
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <div className="flex-1">
                    <div className="font-medium">{annotation.label}</div>
                    <div className="text-gray-500">
                      {Math.round(annotation.region.width)}×{Math.round(annotation.region.height)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                    className="p-1 h-6 w-6"
                  >
                    <XIcon size={12} />
                  </Button>
                </div>
              ))}
            </div>
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