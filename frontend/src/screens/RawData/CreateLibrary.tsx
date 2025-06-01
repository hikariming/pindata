import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeftIcon } from 'lucide-react';

interface CreateLibraryProps {
  onBack: () => void;
}

export const CreateLibrary = ({ onBack }: CreateLibraryProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[1200px] p-6">
      <Button
        variant="ghost"
        className="mb-6 text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
        onClick={onBack}
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        {t('rawData.backToList')}
      </Button>

      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c] mb-2">
          {t('rawData.createNewLibrary')}
        </h2>
        <p className="text-[#4f7096]">{t('rawData.createLibraryDescription')}</p>
      </div>

      <Card className="border-[#d1dbe8] bg-white p-6">
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0c141c]">
              {t('rawData.libraryName')}
            </label>
            <Input
              placeholder={t('rawData.libraryNamePlaceholder')}
              className="border-[#d1dbe8] focus:border-[#1977e5]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0c141c]">
              {t('rawData.libraryDescription')}
            </label>
            <Textarea
              placeholder={t('rawData.libraryDescriptionPlaceholder')}
              className="border-[#d1dbe8] focus:border-[#1977e5] min-h-[100px]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2] hover:text-[#0c141c]"
            >
              {t('common.cancel')}
            </Button>
            <Button className="bg-[#1977e5] hover:bg-[#1977e5]/90">
              {t('rawData.createLibrary')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};