import React from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { FORMAT_DETAILS } from '../constants';

export const FormatDetailsModal: React.FC = () => {
  const {
    showFormatDetails,
    selectedFormat,
    setShowFormatDetails
  } = useSmartDatasetCreatorStore();

  if (!showFormatDetails || !selectedFormat || !FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS]) {
    return null;
  }

  const formatDetail = FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0c141c]">
              {formatDetail.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFormatDetails(false)}
            >
              ✕
            </Button>
          </div>
          <div className="space-y-4">
            <p className="text-[#4f7096]">
              {formatDetail.description}
            </p>
            <div>
              <h4 className="font-medium text-[#0c141c] mb-2">数据结构</h4>
              <p className="text-sm text-[#4f7096]">
                {formatDetail.structure}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-[#0c141c] mb-2">优势</h4>
                <ul className="text-sm text-[#4f7096] space-y-1">
                  {formatDetail.advantages.map((advantage, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-green-500 rounded-full" />
                      {advantage}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-[#0c141c] mb-2">局限性</h4>
                <ul className="text-sm text-[#4f7096] space-y-1">
                  {formatDetail.disadvantages.map((disadvantage, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-orange-500 rounded-full" />
                      {disadvantage}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-[#0c141c] mb-2">适用场景</h4>
              <div className="flex flex-wrap gap-2">
                {formatDetail.bestFor.map((useCase, index) => (
                  <span key={index} className="px-2 py-1 bg-[#e8edf2] text-[#4f7096] text-xs rounded">
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-[#0c141c] mb-2">格式示例</h4>
              <pre className="text-xs text-[#4f7096] bg-[#f8fbff] p-3 rounded border overflow-x-auto">
                {formatDetail.example}
              </pre>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}; 