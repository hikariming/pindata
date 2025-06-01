import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { ArrowLeftIcon, FileIcon, UploadIcon, TrashIcon, PlayIcon } from 'lucide-react';

interface LibraryDetailsProps {
  onBack: () => void;
  onFileSelect: (file: any) => void;
  library: {
    id: string;
    name: string;
    fileCount: number;
    lastUpdated: string;
  };
}

interface LibraryFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'pending' | 'processing' | 'processed';
}

export const LibraryDetails = ({ onBack, onFileSelect, library }: LibraryDetailsProps): JSX.Element => {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [files] = React.useState<LibraryFile[]>([
    {
      id: '1',
      name: 'research-paper-2024.pdf',
      type: 'PDF',
      size: '2.5 MB',
      uploadDate: '2024-03-15',
      status: 'processed'
    },
    {
      id: '2',
      name: 'data-analysis.docx',
      type: 'DOCX',
      size: '1.8 MB',
      uploadDate: '2024-03-14',
      status: 'processing'
    },
    {
      id: '3',
      name: 'raw-data.xlsx',
      type: 'XLSX',
      size: '3.2 MB',
      uploadDate: '2024-03-13',
      status: 'pending'
    }
  ]);

  const getStatusColor = (status: LibraryFile['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'processed':
        return 'text-green-600 bg-green-50';
    }
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(file => file.id)));
    }
  };

  const toggleFileSelection = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelectedFiles = new Set(selectedFiles);
    if (selectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleBatchProcess = () => {
    // Handle batch processing logic here
    console.log('Processing files:', Array.from(selectedFiles));
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-bold leading-7 text-[#0c141c] mb-2">
              {library.name}
            </h2>
            <p className="text-[#4f7096]">
              {t('rawData.fileCount')}: {library.fileCount} · {t('rawData.lastUpdated')}: {library.lastUpdated}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedFiles.size > 0 && (
              <>
                <Button 
                  variant="outline" 
                  className="border-[#d1dbe8] text-[#1977e5] hover:text-[#1977e5] hover:bg-[#e8edf2]"
                  onClick={handleBatchProcess}
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Process Selected ({selectedFiles.size})
                </Button>
                <Button variant="outline" className="border-[#d1dbe8] text-red-600 hover:text-red-700 hover:bg-red-50">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </>
            )}
            <Button className="bg-[#1977e5] hover:bg-[#1977e5]/90">
              <UploadIcon className="w-4 h-4 mr-2" />
              {t('rawData.uploadFiles')}
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-[#d1dbe8] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-[#d1dbe8] hover:bg-transparent">
              <TableHead className="w-[40px]">
                <div 
                  className={`w-4 h-4 border border-[#d1dbe8] cursor-pointer ${
                    selectedFiles.size === files.length ? 'bg-[#1977e5] border-[#1977e5]' : ''
                  }`}
                  onClick={toggleSelectAll}
                >
                  {selectedFiles.size === files.length && (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </TableHead>
              <TableHead className="text-[#4f7096] font-medium">{t('rawData.fileName')}</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('rawData.fileType')}</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('rawData.fileSize')}</TableHead>
              <TableHead className="text-[#4f7096] font-medium">{t('rawData.uploadDate')}</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[120px]">{t('rawData.status')}</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[80px]">{t('rawData.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow 
                key={file.id} 
                className="border-[#d1dbe8] hover:bg-[#f7f9fc] cursor-pointer"
                onClick={() => onFileSelect(file)}
              >
                <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                  <div 
                    className={`w-4 h-4 border border-[#d1dbe8] cursor-pointer ${
                      selectedFiles.has(file.id) ? 'bg-[#1977e5] border-[#1977e5]' : ''
                    }`}
                    onClick={(e) => toggleFileSelection(file.id, e)}
                  >
                    {selectedFiles.has(file.id) && (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center">
                    <FileIcon className="w-4 h-4 mr-2 text-[#1977e5]" />
                    <span className="font-medium text-[#0c141c]">{file.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-[#4f7096]">{file.type}</TableCell>
                <TableCell className="py-3 text-[#4f7096]">{file.size}</TableCell>
                <TableCell className="py-3 text-[#4f7096]">{file.uploadDate}</TableCell>
                <TableCell className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                    {t(`rawData.fileStatus.${file.status}`)}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle delete
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};