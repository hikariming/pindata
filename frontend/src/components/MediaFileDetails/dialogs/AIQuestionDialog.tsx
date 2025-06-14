import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { MessageSquare, Sparkles, User, Search } from 'lucide-react';

interface AIQuestionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (questions: string[]) => void;
  isProcessing: boolean;
  fileType: 'image' | 'video';
  selectedRegion?: { x: number; y: number; width: number; height: number } | null;
}

// 预制问题库
const PRESET_QUESTIONS = {
  image: {
    general: [
      "这张图片的主要内容是什么？",
      "图片中有哪些颜色？",
      "图片的整体风格是什么？",
      "图片中有多少个人？",
      "图片拍摄的环境是室内还是室外？"
    ],
    objects: [
      "图片中有哪些物体？",
      "请识别图片中的所有动物",
      "图片中有哪些建筑物？",
      "请描述图片中的车辆",
      "图片中的植物有哪些？"
    ],
    details: [
      "图片中的文字内容是什么？",
      "请分析图片的构图和布局",
      "图片中人物的表情和动作是什么？",
      "图片的光线条件如何？",
      "图片中有什么特殊的细节？"
    ],
    regional: [
      "选中区域内的主要内容是什么？",
      "这个区域有什么特殊之处？",
      "选中区域的颜色特征是什么？",
      "这个区域内有哪些物体？",
      "选中区域的质量如何？"
    ]
  },
  video: {
    general: [
      "这个视频的主要内容是什么？",
      "视频中发生了什么事情？",
      "视频的场景在哪里？",
      "视频中有多少个人？",
      "视频的总体氛围是什么样的？"
    ],
    action: [
      "视频中的主要动作是什么？",
      "视频中人物在做什么？",
      "视频中发生了什么事件？",
      "视频的情节发展如何？",
      "视频中有哪些重要的时刻？"
    ],
    technical: [
      "视频的画质如何？",
      "视频的拍摄手法是什么？",
      "视频中的音效如何？",
      "视频的剪辑风格是什么？",
      "视频的色彩搭配如何？"
    ]
  }
};

export const AIQuestionDialog: React.FC<AIQuestionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isProcessing,
  fileType,
  selectedRegion
}) => {
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('general');

  const handleQuestionToggle = (question: string) => {
    setSelectedQuestions(prev => 
      prev.includes(question) 
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  const handleSubmit = () => {
    // 将自定义问题也添加到选中问题列表中
    const allQuestions = [...selectedQuestions];
    if (customQuestion.trim()) {
      allQuestions.push(customQuestion.trim());
    }
    
    if (allQuestions.length === 0) return;
    
    onSubmit(allQuestions);
    setSelectedQuestions([]);
    setCustomQuestion('');
  };

  const handleClose = () => {
    setSelectedQuestions([]);
    setCustomQuestion('');
    onClose();
  };

  const questions = PRESET_QUESTIONS[fileType];
  const availableCategories = Object.keys(questions);
  
  // 如果有选中区域，优先显示区域相关问题
  const shouldShowRegionalQuestions = selectedRegion && fileType === 'image';

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: '通用问题',
      objects: '物体识别',
      details: '细节分析',
      regional: '区域分析',
      action: '动作分析',
      technical: '技术分析'
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general': return <MessageSquare size={16} />;
      case 'objects': return <Search size={16} />;
      case 'details': return <Sparkles size={16} />;
      case 'regional': return <Search size={16} />;
      case 'action': return <User size={16} />;
      case 'technical': return <Sparkles size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare size={20} />
            <span>AI图片问答</span>
            {selectedRegion && (
              <Badge variant="outline" className="ml-2">
                已选择区域: {Math.round(selectedRegion.width)}×{Math.round(selectedRegion.height)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 分类选择 */}
          <div className="flex space-x-2 flex-wrap">
            {shouldShowRegionalQuestions && (
              <Button
                size="sm"
                variant={activeCategory === 'regional' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('regional')}
                className="flex items-center space-x-1"
              >
                {getCategoryIcon('regional')}
                <span>{getCategoryLabel('regional')}</span>
              </Button>
            )}
            {availableCategories.map(category => (
              <Button
                key={category}
                size="sm"
                variant={activeCategory === category ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category)}
                className="flex items-center space-x-1"
              >
                {getCategoryIcon(category)}
                <span>{getCategoryLabel(category)}</span>
              </Button>
            ))}
          </div>

          {/* 问题列表 */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 显示区域问题（如果有选中区域） */}
              {shouldShowRegionalQuestions && activeCategory === 'regional' && 
                PRESET_QUESTIONS.image.regional.map((question, index) => (
                  <Card
                    key={`regional-${index}`}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedQuestions.includes(question)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleQuestionToggle(question)}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedQuestions.includes(question)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedQuestions.includes(question) && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{question}</p>
                    </div>
                  </Card>
                ))
              }
              
              {/* 显示对应分类的问题 */}
              {questions[activeCategory as keyof typeof questions]?.map((question, index) => (
                <Card
                  key={`${activeCategory}-${index}`}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedQuestions.includes(question)
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleQuestionToggle(question)}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedQuestions.includes(question)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedQuestions.includes(question) && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{question}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 自定义问题 */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">自定义问题</label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (customQuestion.trim()) {
                    setSelectedQuestions(prev => [...prev, customQuestion.trim()]);
                    setCustomQuestion('');
                  }
                }}
                disabled={!customQuestion.trim()}
                className="h-6 px-2 text-xs"
              >
                添加到选择
              </Button>
            </div>
            <Textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="输入您想要问AI的问题..."
              rows={3}
              className="resize-none"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && customQuestion.trim()) {
                  setSelectedQuestions(prev => [...prev, customQuestion.trim()]);
                  setCustomQuestion('');
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              输入问题后点击"添加到选择"按钮，或按 Ctrl+Enter 快速添加
            </p>
          </div>

          {/* 选中的问题摘要 */}
          {selectedQuestions.length > 0 && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">
                已选择 {selectedQuestions.length} 个问题
              </label>
              <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                {selectedQuestions.map((question, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => handleQuestionToggle(question)}
                  >
                    {question.length > 20 ? `${question.substring(0, 20)}...` : question}
                    <span className="ml-1 text-red-500">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedQuestions.length === 0 && !customQuestion.trim() || isProcessing}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                AI分析中...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                开始AI问答 ({selectedQuestions.length + (customQuestion.trim() ? 1 : 0)}个问题)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};