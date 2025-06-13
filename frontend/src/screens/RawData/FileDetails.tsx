import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, Download, Trash, File, CheckCircle, Clock, Settings, RefreshCw } from 'lucide-react';

export const FileDetails = (): JSX.Element => {
  const { t } = useTranslation();
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  // Mock file data - in real app, you would fetch based on fileId
  const file = {
    id: fileId || '1',
    name: `file_${fileId || '1'}.pdf`,
    type: 'PDF',
    size: '2.5MB',
    uploadDate: '2024-03-15',
    status: 'processed' as const
  };

  const handleBack = () => {
    navigate('/rawdata');
  };

  const processingSteps = [
    {
      number: 1,
      name: 'Text Extraction',
      startTime: '2024-03-15 10:30:00',
      endTime: '2024-03-15 10:31:30',
      duration: '1m 30s',
      completed: true
    },
    {
      number: 2,
      name: 'Data Classification',
      startTime: '2024-03-15 10:31:30',
      endTime: '2024-03-15 10:32:45',
      duration: '1m 15s',
      completed: true
    },
    {
      number: 3,
      name: 'Quality Check',
      startTime: '2024-03-15 10:32:45',
      endTime: '2024-03-15 10:33:30',
      duration: '45s',
      completed: true
    }
  ];

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('rawData.backToList')}
          </Button>
          <div className="flex items-center gap-3">
            <File className="w-6 h-6 text-[#1977e5]" />
            <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">{file.name}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#d1dbe8]">
            <Download className="w-4 h-4 mr-2" />
            {t('rawData.fileDetails.download')}
          </Button>
          <Button variant="outline" className="border-[#d1dbe8] text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash className="w-4 h-4 mr-2" />
            {t('rawData.fileDetails.delete')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="border-b border-[#d1dbe8] w-full justify-start h-auto p-0 bg-transparent">
          <TabsTrigger
            value="preview"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            {t('rawData.fileDetails.preview')}
          </TabsTrigger>
          <TabsTrigger
            value="parsed"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            {t('rawData.fileDetails.parsedFile')}
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            {t('rawData.fileDetails.parseSettings')}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            {t('rawData.fileDetails.processingHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          <Card className="border-[#d1dbe8] p-6">
            <div className="min-h-[400px] flex items-center justify-center text-[#4f7096]">
              {t('rawData.fileDetails.noPreview')}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="parsed" className="mt-6">
          <Card className="border-[#d1dbe8] p-6">
            <div className="min-h-[400px] flex items-center justify-center text-[#4f7096]">
              {t('rawData.fileDetails.parsedContent')}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="border-[#d1dbe8] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">{t('rawData.fileDetails.parseSettings')}</h3>
              <Button className="bg-[#1977e5] hover:bg-[#1977e5]/90">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('rawData.fileDetails.reParse')}
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f7f9fc] rounded-lg">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-[#4f7096]" />
                  <span className="font-medium">{t('rawData.fileDetails.parserType')}</span>
                </div>
                <span className="text-[#4f7096]">Default Parser</span>
              </div>
              {/* Add more settings as needed */}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-[#d1dbe8] p-6">
            <h3 className="font-semibold mb-6">{t('rawData.fileDetails.processingSteps')}</h3>
            <div className="space-y-4">
              {processingSteps.map((step) => (
                <div key={step.number} className="flex items-start gap-3">
                  <div className="mt-1">
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {t('rawData.fileDetails.step', { number: step.number })}: {step.name}
                        </p>
                        <p className="text-sm text-[#4f7096]">
                          {t('rawData.fileDetails.duration')}: {step.duration}
                        </p>
                      </div>
                      {step.completed && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          {t('rawData.fileDetails.completed')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-[#4f7096]">
                      <p>{step.startTime} - {step.endTime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};