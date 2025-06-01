import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
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
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  DatabaseIcon, 
  DownloadIcon, 
  EyeIcon, 
  HeartIcon, 
  SearchIcon, 
  SlidersHorizontalIcon 
} from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  owner: string;
  lastUpdated: string;
  size: string;
  downloads: number;
  likes: number;
}

export const Datasets = (): JSX.Element => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'downloads' | 'likes'>('trending');

  const [datasets] = useState<Dataset[]>([
    {
      id: '1',
      name: 'open-r1/Mixture-of-Thoughts',
      owner: 'open-r1',
      lastUpdated: '5 days ago',
      size: '699k',
      downloads: 11300,
      likes: 140
    },
    {
      id: '2',
      name: 'MiniMaxAI/SynLogic',
      owner: 'MiniMaxAI',
      lastUpdated: '1 day ago',
      size: '49.3k',
      downloads: 211,
      likes: 51
    },
    {
      id: '3',
      name: 'cognitivecomputations/china-refusals',
      owner: 'cognitivecomputations',
      lastUpdated: '5 days ago',
      size: '10.1k',
      downloads: 302,
      likes: 25
    }
  ]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">
            {t('navigation.datasets')}
          </h2>
          <span className="text-[#4f7096] text-lg">408,513</span>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4f7096] w-4 h-4" />
          <Input
            className="pl-9 border-[#d1dbe8]"
            placeholder="Filter by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="border-[#d1dbe8] px-4 flex items-center gap-2"
        >
          <span>Sort: {sortBy}</span>
          <SlidersHorizontalIcon className="w-4 h-4" />
        </Button>
      </div>

      <Card className="border-[#d1dbe8]">
        {datasets.map((dataset, index) => (
          <div
            key={dataset.id}
            className={`p-4 flex items-start gap-4 ${
              index < datasets.length - 1 ? 'border-b border-[#d1dbe8]' : ''
            }`}
          >
            <DatabaseIcon className="w-5 h-5 text-[#1977e5] mt-1" />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#0c141c] hover:text-[#1977e5] cursor-pointer">
                    {dataset.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-[#4f7096] mt-1">
                    <span>Updated {dataset.lastUpdated}</span>
                    <span>{dataset.size}</span>
                    <span className="flex items-center gap-1">
                      <DownloadIcon className="w-4 h-4" />
                      {formatNumber(dataset.downloads)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartIcon className="w-4 h-4" />
                      {dataset.likes}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-[#d1dbe8] h-8 px-3"
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};