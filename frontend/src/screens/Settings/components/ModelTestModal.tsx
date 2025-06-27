// frontend/src/screens/Settings/components/ModelTestModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { LLMConfig } from '../../../types/llm';
import { LLMService } from '../../../services/llm.service';
import { useTranslation } from 'react-i18next';

interface ModelTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  llmConfig: LLMConfig | null;
}

export const ModelTestModal: React.FC<ModelTestModalProps> = ({ isOpen, onClose, llmConfig }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('regular');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!llmConfig) return;

    setIsLoading(true);
    setResult(null);
    try {
      const response = await LLMService.testModel(
        llmConfig.id,
        prompt,
        activeTab === 'vision' ? imageUrl : undefined
      );
      setResult(response.result);
    } catch (error) {
      console.error('Model test failed:', error);
      setResult({ error: '测试失败，请检查控制台输出。' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-md">
        <h4 className="font-semibold mb-2">测试结果</h4>
        {result.error && <p className="text-red-500">{result.error}</p>}
        {result.response && (
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result.response, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>测试模型: {llmConfig?.name}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="regular">常规模型</TabsTrigger>
            <TabsTrigger value="reasoning" disabled={!llmConfig?.supports_reasoning}>
              思考模型
            </TabsTrigger>
            <TabsTrigger value="vision" disabled={!llmConfig?.supports_vision}>
              多模态模型
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="mt-4">
            <Textarea
              placeholder="请输入你的提示..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
            />
          </TabsContent>
          <TabsContent value="reasoning" className="mt-4">
            <Textarea
              placeholder="请输入你的提示，模型将展示思考过程..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
            />
          </TabsContent>
          <TabsContent value="vision" className="mt-4">
            <div className="space-y-4">
              <Textarea
                placeholder="请输入你的提示..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="请输入图片URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {renderResult()}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleTest} disabled={isLoading}>
            {isLoading ? '测试中...' : '发送测试'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
