import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  PlusIcon, 
  TrashIcon, 
  BrainIcon, 
  CheckIcon, 
  XIcon,
  EditIcon,
  ZoomInIcon,
  ZoomOutIcon
} from 'lucide-react';

interface QAPair {
  id: string;
  question: string;
  answer: string;
  confidence?: number;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  source: 'human' | 'ai';
}

interface ImageQAAnnotatorProps {
  imageUrl: string;
  existingAnnotations?: QAPair[];
  onSave: (annotations: QAPair[]) => void;
  onAIAssist: (questions?: string[]) => Promise<any>;
  isLoading?: boolean;
}

export const ImageQAAnnotator: React.FC<ImageQAAnnotatorProps> = ({
  imageUrl,
  existingAnnotations = [],
  onSave,
  onAIAssist,
  isLoading = false
}) => {
  const [annotations, setAnnotations] = useState<QAPair[]>(existingAnnotations);
  const [selectedRegion, setSelectedRegion] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<QAPair[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [scale, setScale] = useState(1);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    drawAnnotations();
  }, [annotations, selectedRegion, scale]);

  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制现有标注
    annotations.forEach((annotation, index) => {
      if (annotation.region) {
        const { x, y, width, height } = annotation.region;
        
        // 绘制矩形框
        ctx.strokeStyle = annotation.source === 'ai' ? '#3b82f6' : '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
        
        // 绘制标签
        ctx.fillStyle = annotation.source === 'ai' ? '#3b82f6' : '#10b981';
        ctx.fillRect(x * scale, y * scale - 20, 30, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Q${index + 1}`, x * scale + 5, y * scale - 5);
      }
    });

    // 绘制当前选择的区域
    if (selectedRegion) {
      const { x, y, width, height } = selectedRegion;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingIndex !== null) return;
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setDrawStart({ x, y });
    setSelectedRegion({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    
    setSelectedRegion({
      x: Math.min(drawStart.x, currentX),
      y: Math.min(drawStart.y, currentY),
      width: Math.abs(currentX - drawStart.x),
      height: Math.abs(currentY - drawStart.y)
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDrawStart(null);
  };

  const addNewAnnotation = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newAnnotation: QAPair = {
      id: Date.now().toString(),
      question: newQuestion,
      answer: newAnswer,
      region: selectedRegion || undefined,
      source: 'human'
    };

    setAnnotations([...annotations, newAnnotation]);
    setNewQuestion('');
    setNewAnswer('');
    setSelectedRegion(null);
    setEditingIndex(null);
  };

  const updateAnnotation = (index: number, updates: Partial<QAPair>) => {
    const updated = [...annotations];
    updated[index] = { ...updated[index], ...updates };
    setAnnotations(updated);
  };

  const deleteAnnotation = (index: number) => {
    const updated = annotations.filter((_, i) => i !== index);
    setAnnotations(updated);
    setEditingIndex(null);
  };

  const handleAIAssist = async () => {
    try {
      const customQuestions = annotations
        .filter(a => a.question.trim())
        .map(a => a.question);
      
      const result = await onAIAssist(customQuestions.length > 0 ? customQuestions : undefined);
      
      if (result.annotation_data?.qa_pairs) {
        const aiAnnotations: QAPair[] = result.annotation_data.qa_pairs.map((qa: any, index: number) => ({
          id: `ai_${Date.now()}_${index}`,
          question: qa.question,
          answer: qa.answer,
          confidence: qa.confidence,
          source: 'ai' as const
        }));
        
        setAiSuggestions(aiAnnotations);
        setShowAISuggestions(true);
      }
    } catch (error) {
      console.error('AI辅助失败:', error);
    }
  };

  const acceptAISuggestion = (suggestion: QAPair) => {
    setAnnotations([...annotations, { ...suggestion, source: 'human' }]);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleAIAssist}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <BrainIcon size={16} className="mr-2" />
            {isLoading ? 'AI处理中...' : 'AI辅助'}
          </Button>
          <Button onClick={zoomIn} variant="outline" size="sm">
            <ZoomInIcon size={16} />
          </Button>
          <Button onClick={zoomOut} variant="outline" size="sm">
            <ZoomOutIcon size={16} />
          </Button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            人工标注: {annotations.filter(a => a.source === 'human').length}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            AI标注: {annotations.filter(a => a.source === 'ai').length}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 图片区域 */}
        <div className="flex-1 relative overflow-auto" ref={containerRef}>
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="标注图片"
              className="max-w-none"
              style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onLoad={() => {
                const canvas = canvasRef.current;
                const image = imageRef.current;
                if (canvas && image) {
                  canvas.width = image.naturalWidth;
                  canvas.height = image.naturalHeight;
                  drawAnnotations();
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
            />
          </div>
        </div>

        {/* 标注面板 */}
        <div className="w-96 bg-white border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">图片问答标注</h3>
            
            {/* 新增标注 */}
            <Card className="p-4 mb-4">
              <h4 className="font-medium mb-3">添加新问答</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">问题</label>
                  <Input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="输入问题..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">答案</label>
                  <Textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="输入答案..."
                    rows={3}
                  />
                </div>
                {selectedRegion && (
                  <div className="text-xs text-gray-500">
                    选择区域: ({Math.round(selectedRegion.x)}, {Math.round(selectedRegion.y)}) 
                    {Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}
                  </div>
                )}
                <Button
                  onClick={addNewAnnotation}
                  disabled={!newQuestion.trim() || !newAnswer.trim()}
                  className="w-full"
                >
                  <PlusIcon size={16} className="mr-2" />
                  添加标注
                </Button>
              </div>
            </Card>

            {/* 现有标注列表 */}
            <div className="space-y-3">
              <h4 className="font-medium">标注列表 ({annotations.length})</h4>
              {annotations.map((annotation, index) => (
                <Card key={annotation.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">Q{index + 1}</span>
                      <Badge 
                        variant={annotation.source === 'ai' ? 'default' : 'outline'}
                        className={annotation.source === 'ai' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                      >
                        {annotation.source === 'ai' ? 'AI' : '人工'}
                      </Badge>
                      {annotation.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(annotation.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      >
                        <EditIcon size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnnotation(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <Input
                        value={annotation.question}
                        onChange={(e) => updateAnnotation(index, { question: e.target.value })}
                        className="text-sm"
                      />
                      <Textarea
                        value={annotation.answer}
                        onChange={(e) => updateAnnotation(index, { answer: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => setEditingIndex(null)}>
                          <CheckIcon size={14} className="mr-1" />
                          保存
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
                          <XIcon size={14} className="mr-1" />
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{annotation.question}</p>
                      <p className="text-sm text-gray-600">{annotation.answer}</p>
                      {annotation.region && (
                        <p className="text-xs text-gray-400">
                          区域: ({Math.round(annotation.region.x)}, {Math.round(annotation.region.y)}) 
                          {Math.round(annotation.region.width)} × {Math.round(annotation.region.height)}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* 保存按钮 */}
            <div className="mt-6 pt-4 border-t">
              <Button 
                onClick={() => onSave(annotations)} 
                className="w-full bg-green-500 hover:bg-green-600"
              >
                保存所有标注 ({annotations.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI建议模态框 */}
      {showAISuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI标注建议</h3>
              <Button variant="ghost" onClick={() => setShowAISuggestions(false)}>
                <XIcon size={20} />
              </Button>
            </div>
            
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <Card key={suggestion.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">建议 {index + 1}</span>
                      {suggestion.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          置信度: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => acceptAISuggestion(suggestion)}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <CheckIcon size={14} className="mr-1" />
                      采用
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{suggestion.question}</p>
                    <p className="text-sm text-gray-600">{suggestion.answer}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};