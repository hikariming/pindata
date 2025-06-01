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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { FolderIcon, PlusIcon, MoreVerticalIcon, EyeIcon, TrashIcon } from 'lucide-react';
import { CreateLibrary } from './CreateLibrary';
import { LibraryDetails } from './LibraryDetails';

interface Library {
  id: string;
  name: string;
  fileCount: number;
  lastUpdated: string;
}

type View = 'list' | 'create' | 'details';

interface RawDataProps {
  onFileSelect: (file: any) => void;
}

export const RawData = ({ onFileSelect }: RawDataProps): JSX.Element => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('list');
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraries] = useState<Library[]>([
    {
      id: '1',
      name: 'Research Papers',
      fileCount: 25,
      lastUpdated: '2024-03-15',
    },
    {
      id: '2',
      name: 'Technical Documentation',
      fileCount: 18,
      lastUpdated: '2024-03-14',
    },
    {
      id: '3',
      name: 'Legal Documents',
      fileCount: 12,
      lastUpdated: '2024-03-10',
    },
    {
      id: '4',
      name: 'Project Reports',
      fileCount: 30,
      lastUpdated: '2024-03-05',
    },
  ]);

  const handleViewLibrary = (library: Library) => {
    setSelectedLibrary(library);
    setView('details');
  };

  if (view === 'create') {
    return <CreateLibrary onBack={() => setView('list')} />;
  }

  if (view === 'details' && selectedLibrary) {
    return (
      <LibraryDetails 
        onBack={() => setView('list')} 
        library={selectedLibrary}
        onFileSelect={onFileSelect}
      />
    );
  }

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c] mb-4">{t('rawData.libraryManagement')}</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 px-4 bg-[#1977e5] hover:bg-[#1977e5]/90"
            onClick={() => setView('create')}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {t('rawData.createLibrary')}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c] mb-4">{t('rawData.libraryList')}</h2>
        <Card className="border-[#d1dbe8] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-[#d1dbe8] hover:bg-transparent">
                <TableHead className="text-[#4f7096] font-medium">{t('rawData.libraryName')}</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('rawData.fileCount')}</TableHead>
                <TableHead className="text-[#4f7096] font-medium">{t('rawData.lastUpdated')}</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[80px]">{t('rawData.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {libraries.map((library) => (
                <TableRow 
                  key={library.id} 
                  className="border-[#d1dbe8] hover:bg-[#f7f9fc] cursor-pointer"
                  onClick={() => handleViewLibrary(library)}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center">
                      <FolderIcon className="w-4 h-4 mr-2 text-[#1977e5]" />
                      <span className="font-medium text-[#0c141c]">{library.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-[#4f7096]">{library.fileCount}</TableCell>
                  <TableCell className="py-3 text-[#4f7096]">{library.lastUpdated}</TableCell>
                  <TableCell className="py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#e8edf2]">
                          <MoreVerticalIcon className="h-4 w-4 text-[#4f7096]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem
                          className="cursor-pointer text-[#0c141c]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewLibrary(library);
                          }}
                        >
                          <EyeIcon className="mr-2 h-4 w-4" />
                          <span>{t('rawData.view')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer text-red-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          <span>{t('rawData.delete')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};