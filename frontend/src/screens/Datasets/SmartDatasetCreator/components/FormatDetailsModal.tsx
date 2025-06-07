import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Button } from '../../../../components/ui/button';
import { 
  CheckIcon,
  XIcon,
  InfoIcon,
  CodeIcon
} from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { FORMAT_DETAILS } from '../constants';

export const FormatDetailsModal: React.FC = () => {
  const {
    showFormatDetails,
    selectedFormat,
    setShowFormatDetails
  } = useSmartDatasetCreatorStore();

  const formatDetails = selectedFormat ? FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS] : null;

  if (!formatDetails) return null;

  return (
    <Dialog open={showFormatDetails} onOpenChange={setShowFormatDetails}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-[#1977e5]" />
            {formatDetails.name} 详细说明
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-lg font-semibold text-[#0c141c] mb-2">格式说明</h3>
            <p className="text-[#4f7096]">{formatDetails.description}</p>
          </div>

          {/* 数据结构 */}
          <div>
            <h3 className="text-lg font-semibold text-[#0c141c] mb-2">数据结构</h3>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
              <code className="text-sm text-[#1977e5]">{formatDetails.structure}</code>
            </div>
          </div>

          {/* 优缺点对比 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0c141c] mb-3 flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                优势
              </h3>
              <ul className="space-y-2">
                {formatDetails.advantages.map((advantage, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#4f7096]">{advantage}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#0c141c] mb-3 flex items-center gap-2">
                <XIcon className="w-5 h-5 text-red-600" />
                局限性
              </h3>
              <ul className="space-y-2">
                {formatDetails.disadvantages.map((disadvantage, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <XIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#4f7096]">{disadvantage}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 最适用场景 */}
          <div>
            <h3 className="text-lg font-semibold text-[#0c141c] mb-2">最适用场景</h3>
            <div className="flex flex-wrap gap-2">
              {formatDetails.bestFor.map((scenario, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-[#e0f2fe] text-[#0277bd] text-sm rounded-full"
                >
                  {scenario}
                </span>
              ))}
            </div>
          </div>

          {/* 示例代码 */}
          <div>
            <h3 className="text-lg font-semibold text-[#0c141c] mb-3 flex items-center gap-2">
              <CodeIcon className="w-5 h-5 text-[#1977e5]" />
              格式示例
            </h3>
            <div className="bg-[#0c141c] text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{formatDetails.example}</pre>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowFormatDetails(false)}
              className="bg-[#1977e5] hover:bg-[#1565c0]"
            >
              了解了
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 