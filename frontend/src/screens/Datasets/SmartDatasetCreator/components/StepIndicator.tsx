import React from 'react';
import { CheckCircleIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { STEPS } from '../constants';

export const StepIndicator: React.FC = () => {
  const currentStep = useSmartDatasetCreatorStore(state => state.currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between max-w-4xl mx-auto">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                currentStep >= step.id 
                  ? 'bg-[#1977e5] border-[#1977e5] text-white shadow-lg' 
                  : 'border-[#d1dbe8] text-[#4f7096] hover:border-[#1977e5]'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 transition-all duration-300 ${
                  currentStep > step.id ? 'bg-[#1977e5]' : 'bg-[#d1dbe8]'
                }`} />
              )}
            </div>
            <div className="mt-3 text-center max-w-[140px]">
              <h3 className={`text-sm font-medium transition-colors duration-300 ${
                currentStep >= step.id ? 'text-[#1977e5]' : 'text-[#4f7096]'
              }`}>
                {step.name}
              </h3>
              <p className={`text-xs mt-1 transition-colors duration-300 ${
                currentStep === step.id ? 'text-[#4f7096]' : 'text-[#8fa3b8]'
              }`}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
          currentStep <= STEPS.length ? 'bg-[#f0f4f8] border border-[#1977e5]' : 'bg-green-50 border border-green-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            currentStep <= STEPS.length ? 'bg-[#1977e5]' : 'bg-green-500'
          }`} />
          <span className={`text-sm font-medium ${
            currentStep <= STEPS.length ? 'text-[#1977e5]' : 'text-green-700'
          }`}>
            {currentStep <= STEPS.length ? `步骤 ${currentStep} / ${STEPS.length}` : '完成'}
          </span>
        </div>
      </div>
    </div>
  );
}; 