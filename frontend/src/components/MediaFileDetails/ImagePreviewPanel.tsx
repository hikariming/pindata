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
  SaveIcon,
  CheckIcon,
  RefreshCwIcon,
  TrashIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { AIQuestionDialog } from './dialogs/AIQuestionDialog';
import { ObjectDetectionDialog } from './dialogs/ObjectDetectionDialog';
import { useImageAnnotations } from '../../hooks/useImageAnnotations';
import type { ImageAnnotation } from '../../types/annotation';

interface Annotation {
  id: string;
  region: { x: number; y: number; width: number; height: number };
  label: string;
  type: 'manual' | 'ai' | 'detection';
  source: 'human' | 'ai';
  timestamp: number;
  confidence?: number;
  category?: string;
  description?: string;
}

interface ImagePreviewPanelProps {
  fileData: any;
  previewUrl: string;
  onAIAnnotation: (type: string, options?: any) => void;
  onSaveAnnotation?: (annotation: Annotation) => Promise<void>;
  onAnnotationsChange?: (annotations: any[]) => void;
}

interface ObjectDetectionOptions {
  mode: 'auto' | 'specific' | 'custom';
  categories?: string[];
  customObjects?: string[];
  confidence?: number;
  region?: { x: number; y: number; width: number; height: number };
}

export const ImagePreviewPanel: React.FC<ImagePreviewPanelProps> = ({
  fileData,
  previewUrl,
  onAIAnnotation,
  onSaveAnnotation,
  onAnnotationsChange
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
  const [annotationDescription, setAnnotationDescription] = useState('');
  const [imageNaturalSize, setImageNaturalSize] = useState<{width: number, height: number} | null>(null);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('标注保存成功！');
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAnnotationId, setDeletingAnnotationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 对话框状态
  const [showAIQuestionDialog, setShowAIQuestionDialog] = useState(false);
  const [showObjectDetectionDialog, setShowObjectDetectionDialog] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // 使用图片标注 hook
  const {
    annotations: dbAnnotations,
    loading: annotationsLoading,
    createAnnotation,
    deleteAnnotation,
    refreshAnnotations
  } = useImageAnnotations(fileData?.id || '');


  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle wheel events for zoom to avoid passive listener issues
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 强制重绘函数
  const forceRedraw = () => {
    setTimeout(() => {
      drawRegionOverlay();
    }, 50);
  };

  useEffect(() => {
    drawRegionOverlay();
  }, [selectedRegion, annotations, scale, position, rotation, imageNaturalSize, highlightedAnnotationId]);

  // 加载数据库中的标注
  useEffect(() => {
    if (dbAnnotations && dbAnnotations.length > 0) {
      const convertedAnnotations = dbAnnotations
      .filter(dbAnnotation => !!dbAnnotation.region)
      .map(dbAnnotation => ({
        id: dbAnnotation.id,
        region: dbAnnotation.region!,
        label: dbAnnotation.content?.label || dbAnnotation.category || '未知对象',
        type: 'detection' as const,
        source: (dbAnnotation.source === 'HUMAN' || (dbAnnotation.source as any) === 'HUMAN_ANNOTATED') ? 'human' as const : 'ai' as const,
        timestamp: new Date(dbAnnotation.created_at).getTime(),
        confidence: dbAnnotation.confidence,
        category: dbAnnotation.category,
        description: ((dbAnnotation as any).annotation_metadata?.description as string) || '',
      }));
      setAnnotations(convertedAnnotations);
      
      // 通知父组件标注数据已更新
      if (onAnnotationsChange) {
        onAnnotationsChange(dbAnnotations);
      }
      
      // 标注数据加载完成后，确保重新绘制标注框
      setTimeout(() => {
        drawRegionOverlay();
      }, 100);
      
      // 同时调用强制重绘
      forceRedraw();
    } else if (dbAnnotations) {
      setAnnotations([]);
    }
  }, [dbAnnotations, onAnnotationsChange]);

  // 组件加载时刷新标注
  useEffect(() => {
    if (fileData?.id) {
      refreshAnnotations();
    }
  }, [fileData?.id, refreshAnnotations]);


  const drawRegionOverlay = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageNaturalSize) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算图像在canvas中的实际显示尺寸和位置
    const imageRect = image.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect(); 
    const scaleX = canvas.width / imageNaturalSize.width;
    const scaleY = canvas.height / imageNaturalSize.height;
    
    // 设置高质量渲染
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
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
      const isHighlighted = highlightedAnnotationId === annotation.id;
      
      // 根据标注来源设置颜色
      const colorMap = {
        'ai': '#10b981',     // 绿色 - AI生成
        'human': '#f59e0b',  // 橙色 - 人工标注
      };
      const baseColor = colorMap[annotation.source] || '#6b7280';
      const color = isHighlighted ? '#ef4444' : baseColor; // 高亮时使用红色
      
      ctx.strokeStyle = color;
      ctx.lineWidth = isHighlighted ? 3 : 2; // 高亮时线条更粗
      ctx.setLineDash(isHighlighted ? [10, 5] : []); // 高亮时使用虚线
      
      const rectX = x * scaleX;
      const rectY = y * scaleY;
      const rectWidth = width * scaleX;
      const rectHeight = height * scaleY;
      
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      
      // 绘制标签背景
      ctx.fillStyle = color;
      const labelY = rectY - 20;
      const textWidth = ctx.measureText(annotation.label).width + 8;
      ctx.fillRect(rectX, labelY, textWidth, 16);
      
      // 绘制标签文字
      ctx.fillStyle = 'white';
      ctx.font = isHighlighted ? 'bold 12px sans-serif' : '12px sans-serif';
      ctx.fillText(annotation.label, rectX + 4, labelY + 12);
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

  const handleSaveAnnotation = async () => {
    if (!selectedRegion || !annotationLabel.trim()) return;
    
    try {
      setIsLoadingAnnotations(true);
      
      // 保存到数据库
      const annotationData: Omit<ImageAnnotation, 'id' | 'created_at' | 'updated_at'> = {
        file_id: fileData.id,
        type: 'OBJECT_DETECTION',
        source: 'HUMAN',
        content: {
          label: annotationLabel.trim(),
        },
        region: selectedRegion,
        confidence: 1.0,
        category: annotationLabel.trim(),
        metadata: {
          description: annotationDescription.trim() || undefined,
          timestamp: Date.now(),
          annotation_type: 'detection',
        },
      };
      
      await createAnnotation(annotationData);
      
      // 显示成功提示
      setSuccessMessage('标注保存成功！');
      setShowSuccessMessage(true);
      
      // 清空表单并关闭对话框
      setSelectedRegion(null);
      setAnnotationLabel('');
      setAnnotationDescription('');
      setShowAnnotationDialog(false);
      
      // 隐藏成功消息
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
    } catch (error) {
      console.error('保存标注失败:', error);
      // 这里可以添加错误提示
    } finally {
      setIsLoadingAnnotations(false);
    }
  };

  const handleDeleteAnnotation = (id: string) => {
    setDeletingAnnotationId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAnnotation = async () => {
    if (!deletingAnnotationId) return;
    
    try {
      setIsDeleting(true);
      await deleteAnnotation(deletingAnnotationId);
      
      // 显示成功消息
      setSuccessMessage('标注删除成功！');
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
    } catch (error) {
      console.error('删除标注失败:', error);
      // 这里可以添加错误提示
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingAnnotationId(null);
    }
  };

  const cancelDeleteAnnotation = () => {
    setShowDeleteConfirm(false);
    setDeletingAnnotationId(null);
  };

  const handleCancelAnnotation = () => {
    setSelectedRegion(null);
    setAnnotationLabel('');
    setAnnotationDescription('');
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // AI问答处理
  const handleAIQuestions = async (questions: string[], selectedModel?: any) => {
    setIsAIProcessing(true);
    setShowAIQuestionDialog(false);
    
    try {
      const options = {
        questions: questions,
        region: selectedRegion,
        model: selectedModel ? {
          id: selectedModel.id,
          name: selectedModel.name,
          provider: selectedModel.provider,
          model_name: selectedModel.model_name
        } : undefined
      };
      
      await onAIAnnotation('qa', options);
    } catch (error) {
      console.error('AI问答失败:', error);
    } finally {
      setIsAIProcessing(false);
    }
  };

  // 对象检测处理
  const handleObjectDetection = async (options: ObjectDetectionOptions) => {
    setIsAIProcessing(true);
    setShowObjectDetectionDialog(false);
    
    try {
      await onAIAnnotation('object_detection', options);
      
      // 模拟添加检测结果（实际应该从API返回）
      if (options.mode === 'auto') {
        // 模拟自动检测结果
        const mockDetections = [
          { x: 100, y: 100, width: 80, height: 120, label: '人物', confidence: 0.85 },
          { x: 200, y: 150, width: 60, height: 60, label: '汽车', confidence: 0.92 },
        ];
        
        const newAnnotations = mockDetections.map((detection, index) => ({
          id: `detection_${Date.now()}_${index}`,
          region: detection,
          label: detection.label,
          type: 'detection' as const,
          source: 'ai' as const,
          timestamp: Date.now(),
          confidence: detection.confidence
        }));
        
        setAnnotations(prev => [...prev, ...newAnnotations]);
      }
    } catch (error) {
      console.error('对象检测失败:', error);
    } finally {
      setIsAIProcessing(false);
    }
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
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        <Card className="p-2 flex items-center space-x-2 bg-white">
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
        
        <Card className="p-2 flex items-center space-x-2 bg-white">
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
        <Card className="p-2 flex items-center space-x-2 bg-white">
          <Button 
            size="sm" 
            onClick={() => setShowAIQuestionDialog(true)} 
            className="bg-blue-500 hover:bg-blue-600"
            disabled={isAIProcessing}
          >
            <BrainIcon size={16} className="mr-1" />
            {isAIProcessing ? 'AI处理中...' : 'AI问答'}
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowObjectDetectionDialog(true)} 
            className="bg-purple-500 hover:bg-purple-600"
            disabled={isAIProcessing}
          >
            <MousePointerIcon size={16} className="mr-1" />
            对象检测
          </Button>
        </Card>
      </div>

      {/* 图片信息栏 */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3 bg-white">
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
            {annotationsLoading ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <RefreshCwIcon size={12} className="mr-1 animate-spin" />
                加载标注中...
              </Badge>
            ) : annotations.length > 0 ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TagIcon size={12} className="mr-1" />
                已标注: {annotations.length}
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                <TagIcon size={12} className="mr-1" />
                暂无标注
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* 成功提示消息 */}
      {showSuccessMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckIcon size={20} className="text-green-600" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </Card>
        </div>
      )}

      {/* 主图像容器 */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                  
                  // 图片加载完成后立即绘制标注框
                  setTimeout(() => {
                    drawRegionOverlay();
                    forceRedraw();
                  }, 200);
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
          <Card className="p-3 bg-white">
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
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  描述 <span className="text-gray-500">(可选)</span>
                </label>
                <Input
                  placeholder="添加详细描述..."
                  value={annotationDescription}
                  onChange={(e) => setAnnotationDescription(e.target.value)}
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
                  disabled={!annotationLabel.trim() || isLoadingAnnotations}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isLoadingAnnotations ? (
                    <RefreshCwIcon size={16} className="mr-1 animate-spin" />
                  ) : (
                    <SaveIcon size={16} className="mr-1" />
                  )}
                  {isLoadingAnnotations ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 标注列表 */}
      {annotations.length > 0 && (
        <div className="absolute top-20 left-4 z-10 max-w-xs">
          <Card className="p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center">
                <TagIcon size={16} className="mr-1" />
                标注列表 ({annotations.length})
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshAnnotations}
                disabled={annotationsLoading}
                className="p-1 h-6 w-6"
              >
                <RefreshCwIcon size={12} className={annotationsLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {annotations.map((annotation) => (
                <div 
                  key={annotation.id} 
                  className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                    highlightedAnnotationId === annotation.id 
                      ? 'bg-red-100 border border-red-300' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setHighlightedAnnotationId(
                    highlightedAnnotationId === annotation.id ? null : annotation.id
                  )}
                >
                  <div className="flex-1">
                    <div className="font-medium">{annotation.label}</div>
                    <div className="text-gray-500">
                      {Math.round(annotation.region.width)}×{Math.round(annotation.region.height)}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <Badge 
                        variant={annotation.source === 'ai' ? 'default' : 'outline'}
                        className="text-xs px-1 py-0"
                      >
                        {annotation.source === 'ai' ? 'AI' : '人工'}
                      </Badge>
                      {annotation.confidence && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {Math.round(annotation.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                    className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 bg-white bg-opacity-80 border border-red-200"
                  >
                    <TrashIcon size={12} />
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

      {/* AI问答对话框 */}
      <AIQuestionDialog
        open={showAIQuestionDialog}
        onClose={() => setShowAIQuestionDialog(false)}
        onSubmit={handleAIQuestions}
        isProcessing={isAIProcessing}
        fileType="image"
        selectedRegion={selectedRegion}
      />

      {/* 对象检测对话框 */}
      <ObjectDetectionDialog
        open={showObjectDetectionDialog}
        onClose={() => setShowObjectDetectionDialog(false)}
        onSubmit={handleObjectDetection}
        isProcessing={isAIProcessing}
        selectedRegion={selectedRegion}
      />

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="p-6 w-96">
            <div className="flex items-center mb-4">
              <AlertTriangleIcon size={24} className="text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除这个标注吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={cancelDeleteAnnotation}
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button 
                onClick={confirmDeleteAnnotation}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? (
                  <>
                    <RefreshCwIcon size={16} className="mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <TrashIcon size={16} className="mr-2" />
                    确认删除
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};