import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ArrowLeftIcon, WandIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from './store/useSmartDatasetCreatorStore';
import {
  StepIndicator,
  Step1DataSelection,
  Step2DatasetConfig,
  Step3ModelConfig,
  Step4PreviewConfirm,
  Step5Generation,
  NavigationButtons,
  ErrorMessage
} from './components';

export const SmartDatasetCreator: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, progress, resetState } = useSmartDatasetCreatorStore();

  // 组件卸载时重置状态
  useEffect(() => {
    return () => {
      if (progress !== 100) {
        resetState();
      }
    };
  }, [progress, resetState]);

  // 生成完成后跳转
  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        navigate('/datasets');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [progress, navigate]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1DataSelection />;
      case 2:
        return <Step2DatasetConfig />;
      case 3:
        return <Step3ModelConfig />;
      case 4:
        return <Step4PreviewConfirm />;
      case 5:
        return <Step5Generation />;
      default:
        return <Step1DataSelection />;
    }
  };

  return (
    <div className="w-full max-w-[1000px] p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/datasets">
          <Button variant="outline" className="border-[#d1dbe8] flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            返回数据集列表
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <WandIcon className="w-8 h-8 text-[#1977e5]" />
          <h1 className="text-2xl font-bold text-[#0c141c]">智能数据集创建器</h1>
        </div>
        <p className="text-[#4f7096] text-lg max-w-3xl">
          使用AI技术从原始数据自动生成高质量的训练数据集，支持多种数据集类型和格式。
        </p>
      </div>

      {/* Error Message */}
      <ErrorMessage />

      {/* Step Indicator */}
      <StepIndicator />

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <NavigationButtons />
    </div>
  );
}; 