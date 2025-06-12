import React, { useEffect } from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { 
  FileTextIcon, 
  Loader2Icon, 
  RefreshCwIcon, 
  FileIcon, 
  EyeIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DatabaseIcon,
  HashIcon,
  FileCheckIcon
} from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { useTranslation } from 'react-i18next';

export const Step1DataSelection: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedFiles,
    datasetCollections,
    loadingCollections,
    loadDatasetCollections,
    toggleCollectionExpanded,
    handleCollectionSelection,
    handleCollectionFileSelection
  } = useSmartDatasetCreatorStore();

  useEffect(() => {
    if (datasetCollections.length === 0) {
      loadDatasetCollections();
    }
  }, [datasetCollections.length, loadDatasetCollections]);

  const getTotalSelectedCount = () => {
    return selectedFiles.length;
  };

  const getTotalAvailableCount = () => {
    return datasetCollections.reduce((total, collection) => 
      total + collection.markdownFiles.length, 0
    );
  };

  const isFileSelected = (libraryId: string, fileId: string) => {
    return selectedFiles.some(file => file.id === fileId && file.libraryId === libraryId);
  };

  return (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <DatabaseIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">{t('rawData.smartDatasetCreator.step1.title')}</h3>
        </div>

        {loadingCollections ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
            <span>{t('rawData.smartDatasetCreator.step1.loading')}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#4f7096]">
                  {t('rawData.smartDatasetCreator.step1.selectedCount', {
                    selected: getTotalSelectedCount(),
                    total: getTotalAvailableCount()
                  })}
                </span>
              </div>
              <Button variant="outline" onClick={loadDatasetCollections} className="flex items-center gap-2">
                <RefreshCwIcon className="w-4 h-4" />
                {t('rawData.smartDatasetCreator.step1.refresh')}
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {datasetCollections.map((collection) => (
                <div key={collection.library.id} className="border border-[#d1dbe8] rounded-lg">
                  {/* 数据集合头部 */}
                  <div className="flex items-center gap-3 p-4 bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => toggleCollectionExpanded(collection.library.id)}
                    >
                      {collection.expanded ? 
                        <ChevronDownIcon className="w-4 h-4" /> : 
                        <ChevronRightIcon className="w-4 h-4" />
                      }
                    </Button>
                    
                    <Checkbox 
                      checked={collection.selected}
                      onCheckedChange={(checked) => 
                        handleCollectionSelection(collection.library.id, checked as boolean)
                      }
                      disabled={collection.markdownFiles.length === 0}
                    />
                    
                    <FolderIcon className="w-5 h-5 text-[#1977e5]" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0c141c]">{collection.library.name}</span>
                        <span className="text-xs bg-[#e0f2fe] text-[#0277bd] px-2 py-1 rounded">
                          {collection.library.data_type}
                        </span>
                      </div>
                      <div className="text-sm text-[#4f7096] mt-1">
                        {collection.library.description || t('rawData.noDescription')}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#6b7280] mt-1">
                        <span className="flex items-center gap-1">
                          <FileCheckIcon className="w-3 h-3" />
                          {collection.markdownFiles.length} {t('rawData.mdFiles')}
                        </span>
                        <span className="flex items-center gap-1">
                          <HashIcon className="w-3 h-3" />
                          {t('rawData.totalFilesWithCount', { count: collection.library.file_count })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 展开的文件列表 */}
                  {collection.expanded && (
                    <div className="p-2">
                      {collection.markdownFiles.length === 0 ? (
                        <div className="text-center py-6 text-[#6b7280]">
                          <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>{t('rawData.smartDatasetCreator.step1.noMdFiles')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {collection.markdownFiles.map((file) => (
                            <div 
                              key={file.id} 
                              className="flex items-center gap-3 p-3 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] ml-6"
                            >
                              <Checkbox 
                                checked={isFileSelected(collection.library.id, file.id)}
                                onCheckedChange={(checked) => 
                                  handleCollectionFileSelection(collection.library.id, file.id, checked as boolean)
                                }
                              />
                              <FileTextIcon className="w-4 h-4 text-[#059669]" />
                              <div className="flex-1">
                                <div className="font-medium text-[#0c141c] text-sm">{file.original_filename || file.filename}</div>
                                <div className="text-xs text-[#4f7096]">
                                  {file.file_size_human} • 
                                  {file.process_status_label} • 
                                  {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : t('rawData.unknownDate')}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs">
                                <EyeIcon className="w-3 h-3" />
                                {t('rawData.smartDatasetCreator.step1.preview')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {datasetCollections.length === 0 && (
              <div className="text-center py-8 text-[#6b7280]">
                <DatabaseIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('rawData.smartDatasetCreator.step1.noCollections.title')}</p>
                <p className="text-sm mt-1">{t('rawData.smartDatasetCreator.step1.noCollections.description')}</p>
              </div>
            )}

            {/* 选中文件汇总 */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 p-4 bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheckIcon className="w-5 h-5 text-[#1977e5]" />
                  <span className="font-medium text-[#0c141c]">{t('rawData.smartDatasetCreator.step1.selectedFiles.title')}</span>
                  <span className="text-sm text-[#4f7096]">
                    {t('rawData.smartDatasetCreator.step1.selectedFiles.count', { count: selectedFiles.length })}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 text-sm text-[#4f7096] bg-white px-2 py-1 rounded">
                      <span className="text-xs bg-[#e0f2fe] text-[#0277bd] px-1 rounded">
                        {file.libraryName}
                      </span>
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}; 