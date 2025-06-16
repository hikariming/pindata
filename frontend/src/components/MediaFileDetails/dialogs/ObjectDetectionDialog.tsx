import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  MousePointer, 
  Sparkles, 
  User, 
  Car, 
  Home, 
  TreePine, 
  Cat, 
  ShoppingBag,
  Utensils,
  Search,
  Settings,
  Plus,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import {
  getCustomDetectionData,
  addCustomCategory,
  addItemToCategory,
  removeItemFromCategory,
  deleteCustomCategory,
  updateCustomCategory
} from '../../../lib/detectionStorage';

interface ObjectDetectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (options: ObjectDetectionOptions) => void;
  isProcessing: boolean;
  selectedRegion?: { x: number; y: number; width: number; height: number } | null;
}

interface ObjectDetectionOptions {
  mode: 'specific' | 'auto' | 'custom';
  categories?: string[];
  customObjects?: string[];
  confidence?: number;
  region?: { x: number; y: number; width: number; height: number };
}

// 预定义检测类别
const DETECTION_CATEGORIES = {
  people: {
    label: '人物',
    icon: <User size={16} />,
    items: ['人', '脸部', '身体', '手', '头发', '眼睛']
  },
  vehicles: {
    label: '车辆',
    icon: <Car size={16} />,
    items: ['汽车', '卡车', '摩托车', '自行车', '公交车', '出租车']
  },
  buildings: {
    label: '建筑',
    icon: <Home size={16} />,
    items: ['房屋', '楼房', '桥梁', '塔', '教堂', '商店']
  },
  nature: {
    label: '自然',
    icon: <TreePine size={16} />,
    items: ['树木', '花朵', '草地', '山', '水', '天空']
  },
  animals: {
    label: '动物',
    icon: <Cat size={16} />,
    items: ['狗', '猫', '鸟', '鱼', '马', '牛']
  },
  objects: {
    label: '物品',
    icon: <ShoppingBag size={16} />,
    items: ['椅子', '桌子', '电脑', '手机', '书', '包']
  },
  food: {
    label: '食物',
    icon: <Utensils size={16} />,
    items: ['水果', '蔬菜', '面包', '饮料', '蛋糕', '肉类']
  }
};

export const ObjectDetectionDialog: React.FC<ObjectDetectionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isProcessing,
  selectedRegion
}) => {
  const [mode, setMode] = useState<'specific' | 'auto' | 'custom'>('specific');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customObjects, setCustomObjects] = useState<string>('');
  const [confidence, setConfidence] = useState(50);
  
  // 自定义类别相关状态
  const [customDetectionData, setCustomDetectionData] = useState(getCustomDetectionData());
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // 加载自定义数据
  useEffect(() => {
    setCustomDetectionData(getCustomDetectionData());
  }, []);

  // 显示保存通知
  const showSavedNotification = (message: string) => {
    setSavedNotification(message);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 添加新类别
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const newCategory = addCustomCategory(newCategoryName.trim());
      setCustomDetectionData(getCustomDetectionData());
      setNewCategoryName('');
      setShowAddCategory(false);
      showSavedNotification(`类别"${newCategory.label}"已保存到浏览器缓存`);
    } catch (error) {
      console.error('添加类别失败:', error);
      alert('添加类别失败，请重试');
    }
  };

  // 为类别添加新项目
  const handleAddItemToCategory = (categoryId: string) => {
    const newItem = newItemInputs[categoryId]?.trim();
    if (!newItem) return;
    
    try {
      addItemToCategory(categoryId, newItem);
      setCustomDetectionData(getCustomDetectionData());
      setNewItemInputs(prev => ({ ...prev, [categoryId]: '' }));
      showSavedNotification(`项目"${newItem}"已添加并保存到浏览器缓存`);
    } catch (error) {
      console.error('添加项目失败:', error);
      alert('添加项目失败，请重试');
    }
  };

  // 从类别中移除项目
  const handleRemoveItemFromCategory = (categoryId: string, item: string) => {
    try {
      removeItemFromCategory(categoryId, item);
      setCustomDetectionData(getCustomDetectionData());
      showSavedNotification(`项目"${item}"已移除`);
    } catch (error) {
      console.error('移除项目失败:', error);
      alert('移除项目失败，请重试');
    }
  };

  // 删除自定义类别
  const handleDeleteCategory = (categoryId: string) => {
    const category = customDetectionData.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    if (confirm(`确定要删除类别"${category.label}"吗？这将同时删除该类别下的所有项目。`)) {
      try {
        deleteCustomCategory(categoryId);
        setCustomDetectionData(getCustomDetectionData());
        setSelectedCategories(prev => prev.filter(id => id !== categoryId));
        showSavedNotification(`类别"${category.label}"已删除`);
      } catch (error) {
        console.error('删除类别失败:', error);
        alert('删除类别失败，请重试');
      }
    }
  };

  const handleSubmit = () => {
    const options: ObjectDetectionOptions = {
      mode,
      confidence: confidence / 100,
      region: selectedRegion || undefined
    };

    if (mode === 'specific') {
      // 收集所有选中类别的物品
      const allItems: string[] = [];
      selectedCategories.forEach(category => {
        const categoryData = DETECTION_CATEGORIES[category as keyof typeof DETECTION_CATEGORIES];
        if (categoryData) {
          allItems.push(...categoryData.items);
        }
      });
      options.categories = allItems;
    } else if (mode === 'custom') {
      options.customObjects = customObjects.split(',').map(s => s.trim()).filter(s => s);
    }

    onSubmit(options);
    handleClose();
  };

  const handleClose = () => {
    setSelectedCategories([]);
    setCustomObjects('');
    setConfidence(50);
    setMode('specific');
    setShowAddCategory(false);
    setNewCategoryName('');
    setEditingCategory(null);
    setNewItemInputs({});
    onClose();
  };

  const getSelectedItemsCount = () => {
    if (mode === 'specific') {
      return selectedCategories.reduce((count, categoryId) => {
        // 检查是否为预定义类别
        const predefinedCategory = DETECTION_CATEGORIES[categoryId as keyof typeof DETECTION_CATEGORIES];
        if (predefinedCategory) {
          return count + predefinedCategory.items.length;
        }
        
        // 检查是否为自定义类别
        const customCategory = customDetectionData.categories.find(cat => cat.id === categoryId);
        if (customCategory) {
          return count + customCategory.items.length;
        }
        
        return count;
      }, 0);
    } else if (mode === 'custom') {
      return customObjects.split(',').filter(s => s.trim()).length;
    }
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MousePointer size={20} />
            <span>AI对象检测</span>
            {selectedRegion && (
              <Badge variant="outline" className="ml-2">
                检测区域: {Math.round(selectedRegion.width)}×{Math.round(selectedRegion.height)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 检测模式选择 */}
          <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="specific" className="flex items-center space-x-2">
                <Search size={16} />
                <span>指定类别</span>
              </TabsTrigger>
              <TabsTrigger value="auto" className="flex items-center space-x-2">
                <Sparkles size={16} />
                <span>自动检测</span>
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center space-x-2">
                <Settings size={16} />
                <span>自定义</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="specific" className="m-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      选择您想要检测的对象类别，AI将重点识别这些类型的物体：
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddCategory(true)}
                      className="flex items-center space-x-1"
                    >
                      <Plus size={14} />
                      <span>添加类别</span>
                    </Button>
                  </div>

                  {/* 添加新类别输入框 */}
                  {showAddCategory && (
                    <Card className="p-3 bg-yellow-50 border-yellow-200">
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="输入新类别名称..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleAddCategory();
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                          <Save size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddCategory(false)}>
                          <X size={14} />
                        </Button>
                      </div>
                    </Card>
                  )}
                  
                  {/* 预定义类别 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">常见类别</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(DETECTION_CATEGORIES).map(([key, category]) => (
                        <Card
                          key={key}
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedCategories.includes(key)
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleCategoryToggle(key)}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`p-2 rounded ${
                              selectedCategories.includes(key)
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {category.icon}
                            </div>
                            <span className="font-medium">{category.label}</span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {category.items.slice(0, 3).map((item, index) => (
                              <Badge key={index} variant="outline" className="mr-1 text-xs">
                                {item}
                              </Badge>
                            ))}
                            {category.items.length > 3 && (
                              <span className="text-gray-400">等{category.items.length}种</span>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* 自定义类别 */}
                  {customDetectionData.categories.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">我的自定义类别</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customDetectionData.categories.map((category) => (
                          <Card
                            key={category.id}
                            className={`p-3 transition-colors ${
                              selectedCategories.includes(category.id)
                                ? 'border-purple-500 bg-purple-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div 
                                className="flex items-center space-x-2 cursor-pointer flex-1"
                                onClick={() => handleCategoryToggle(category.id)}
                              >
                                <div className={`p-2 rounded ${
                                  selectedCategories.includes(category.id)
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <Settings size={16} />
                                </div>
                                <span className="font-medium">{category.label}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                            
                            {/* 类别项目管理 */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {category.items.map((item) => (
                                  <Badge
                                    key={item}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-red-50"
                                    onClick={() => handleRemoveItemFromCategory(category.id, item)}
                                  >
                                    {item}
                                    <X size={10} className="ml-1 text-red-500" />
                                  </Badge>
                                ))}
                              </div>
                              
                              {/* 添加新项目 */}
                              <div className="flex items-center space-x-1">
                                <Input
                                  size="sm"
                                  placeholder="添加新项目..."
                                  value={newItemInputs[category.id] || ''}
                                  onChange={(e) => setNewItemInputs(prev => ({
                                    ...prev,
                                    [category.id]: e.target.value
                                  }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleAddItemToCategory(category.id);
                                  }}
                                  className="text-xs h-6"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddItemToCategory(category.id)}
                                  disabled={!newItemInputs[category.id]?.trim()}
                                  className="h-6 w-6 p-0"
                                >
                                  <Plus size={10} />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCategories.length > 0 && (
                    <Card className="p-3 bg-green-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Search size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          已选择 {selectedCategories.length} 个类别，包含约 {getSelectedItemsCount()} 种对象
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedCategories.map(categoryId => {
                          const predefinedCategory = DETECTION_CATEGORIES[categoryId as keyof typeof DETECTION_CATEGORIES];
                          const customCategory = customDetectionData.categories.find(cat => cat.id === categoryId);
                          const label = predefinedCategory?.label || customCategory?.label || categoryId;
                          
                          return (
                            <Badge
                              key={categoryId}
                              variant="secondary"
                              className="cursor-pointer hover:bg-red-100"
                              onClick={() => handleCategoryToggle(categoryId)}
                            >
                              {label}
                              <span className="ml-1 text-red-500">×</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="auto" className="m-0">
                <Card className="p-4">
                  <div className="text-center space-y-3">
                    <Sparkles size={48} className="mx-auto text-blue-500" />
                    <h3 className="text-lg font-medium">智能自动检测</h3>
                    <p className="text-gray-600">
                      AI将自动识别图片中的所有常见对象，包括人物、物品、动物、建筑等。
                      这是最全面的检测模式，适合不确定图片内容的情况。
                    </p>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 提示：自动模式会检测数百种常见对象类型，处理时间相对较长但结果最全面。
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="m-0">
                <Card className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">自定义检测对象</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        输入您想要检测的具体对象名称，用逗号分隔。AI将专门查找这些对象。
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        检测对象 <span className="text-gray-500">(用逗号分隔)</span>
                      </label>
                      <Input
                        value={customObjects}
                        onChange={(e) => setCustomObjects(e.target.value)}
                        placeholder="例如: 红色汽车, 苹果, 笔记本电脑, 戴眼镜的人"
                        className="h-12"
                      />
                    </div>

                    {customObjects.trim() && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-2">
                          将检测以下对象：
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {customObjects.split(',').map((obj, index) => {
                            const trimmed = obj.trim();
                            return trimmed ? (
                              <Badge key={index} variant="outline">
                                {trimmed}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        💡 提示：描述越具体，检测结果越准确。例如"红色的汽车"比"汽车"更精准。
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* 置信度设置 */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">检测置信度</label>
                <Badge variant="outline">{confidence}%</Badge>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>低 (更多结果)</span>
                <span>高 (更准确)</span>
              </div>
              <p className="text-xs text-gray-600">
                置信度越高，检测结果越准确但可能遗漏一些对象；置信度越低，会检测到更多对象但可能包含误判。
              </p>
            </div>
          </Card>
        </div>

        {/* 保存通知 */}
        {savedNotification && (
          <div className="bg-green-100 border border-green-200 text-green-700 px-3 py-2 rounded-lg flex items-center space-x-2">
            <AlertCircle size={16} />
            <span className="text-sm">{savedNotification}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isProcessing || 
              (mode === 'specific' && selectedCategories.length === 0) ||
              (mode === 'custom' && !customObjects.trim())
            }
            className="bg-purple-500 hover:bg-purple-600"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                检测中...
              </>
            ) : (
              <>
                <MousePointer size={16} className="mr-2" />
                开始检测
                {mode === 'specific' && selectedCategories.length > 0 && (
                  <span className="ml-1">({getSelectedItemsCount()}种对象)</span>
                )}
                {mode === 'custom' && customObjects.trim() && (
                  <span className="ml-1">({customObjects.split(',').filter(s => s.trim()).length}种对象)</span>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};