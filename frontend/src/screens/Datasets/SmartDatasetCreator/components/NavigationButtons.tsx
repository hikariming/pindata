import React from 'react';
import { Button } from '../../../../components/ui/button';
import { PlayIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { STEPS } from '../constants';

export const NavigationButtons: React.FC = () => {
  const {
    currentStep,
    selectedFiles,
    datasetName,
    prevStep,
    nextStep
  } = useSmartDatasetCreatorStore();

  if (currentStep >= 4) {
    return null;
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedFiles.length > 0;
      case 2:
        return datasetName.trim() !== '';
      default:
        return true;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Button 
        variant="outline" 
        onClick={prevStep}
        disabled={currentStep === 1}
        className="border-[#d1dbe8]"
      >
        上一步
      </Button>
      
      <div className="flex gap-3">
        <Button 
          className="bg-[#1977e5] hover:bg-[#1565c0]"
          onClick={nextStep}
          disabled={!canProceed()}
        >
          下一步
        </Button>
      </div>
    </div>
  );
}; 