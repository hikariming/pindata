import React from 'react';
import { Card } from '../../../../components/ui/card';
import { AlertCircleIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';

export const ErrorMessage: React.FC = () => {
  const error = useSmartDatasetCreatorStore(state => state.error);

  if (!error) return null;

  return (
    <Card className="border-red-200 bg-red-50 mb-6">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="w-5 h-5 text-red-500" />
          <span className="text-red-700 font-medium">错误</span>
        </div>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    </Card>
  );
}; 