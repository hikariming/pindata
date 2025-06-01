import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
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
  SlidersHorizontalIcon,
  PlusIcon,
  GitBranchIcon,
  FileTextIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  HardDriveIcon
} from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  owner: string;
  description: string;
  lastUpdated: string;
  created: string;
  size: string;
  downloads: number;
  likes: number;
  versions: number;
  license: string;
  taskType: string;
  tags: string[];
  language?: string;
  featured?: boolean;
}

export const Datasets = (): JSX.Element => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'downloads' | 'likes' | 'updated'>('trending');
  const [filterBy, setFilterBy] = useState<'all' | 'my-datasets' | 'liked'>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');

  const [datasets] = useState<Dataset[]>([
    {
      id: '1',
      name: 'Mixture-of-Thoughts',
      owner: 'open-r1',
      description: 'A comprehensive dataset for training mixture of expert models with diverse reasoning capabilities.',
      lastUpdated: '5 days ago',
      created: '2024-01-15',
      size: '699MB',
      downloads: 11300,
      likes: 140,
      versions: 3,
      license: 'MIT',
      taskType: 'Natural Language Processing',
      tags: ['reasoning', 'mixture-of-experts', 'llm'],
      language: 'English',
      featured: true
    },
    {
      id: '2',
      name: 'SynLogic',
      owner: 'MiniMaxAI',
      description: 'Synthetic logical reasoning dataset generated using advanced language models.',
      lastUpdated: '1 day ago',
      created: '2024-02-20',
      size: '49.3MB',
      downloads: 211,
      likes: 51,
      versions: 1,
      license: 'Apache 2.0',
      taskType: 'Question Answering',
      tags: ['logic', 'reasoning', 'synthetic'],
      language: 'English'
    },
    {
      id: '3',
      name: 'china-refusals',
      owner: 'cognitivecomputations',
      description: 'Dataset focused on AI safety and alignment research with Chinese language examples.',
      lastUpdated: '5 days ago',
      created: '2024-01-30',
      size: '10.1MB',
      downloads: 302,
      likes: 25,
      versions: 2,
      license: 'CC BY 4.0',
      taskType: 'Text Classification',
      tags: ['safety', 'alignment', 'chinese'],
      language: 'Chinese'
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

  const getTaskTypeColor = (taskType: string): string => {
    const colors: { [key: string]: string } = {
      'Natural Language Processing': 'bg-blue-100 text-blue-800',
      'Question Answering': 'bg-green-100 text-green-800',
      'Text Classification': 'bg-purple-100 text-purple-800',
      'Computer Vision': 'bg-orange-100 text-orange-800',
      'Audio': 'bg-pink-100 text-pink-800'
    };
    return colors[taskType] || 'bg-gray-100 text-gray-800';
  };

  const filteredDatasets = datasets.filter(dataset => {
    if (searchQuery && !dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !dataset.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (taskFilter !== 'all' && dataset.taskType !== taskFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-full max-w-[1200px] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <DatabaseIcon className="w-6 h-6 text-[#1977e5]" />
            <h2 className="text-[24px] font-bold leading-7 text-[#0c141c]">
              数据集
            </h2>
          </div>
          <Badge variant="secondary" className="text-[#4f7096] bg-[#f0f4f8]">
            {formatNumber(408513)} 个数据集
          </Badge>
        </div>
        <Link to="/datasets/create">
          <Button className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            创建数据集
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4f7096] w-4 h-4" />
            <Input
              className="pl-9 border-[#d1dbe8] h-10"
              placeholder="搜索数据集名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-[#d1dbe8] px-4 flex items-center gap-2"
              >
                <span>任务类型: {taskFilter === 'all' ? '全部' : taskFilter}</span>
                <SlidersHorizontalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTaskFilter('all')}>全部</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTaskFilter('Natural Language Processing')}>自然语言处理</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTaskFilter('Question Answering')}>问答系统</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTaskFilter('Text Classification')}>文本分类</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTaskFilter('Computer Vision')}>计算机视觉</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-[#d1dbe8] px-4 flex items-center gap-2"
              >
                <span>排序: {sortBy === 'trending' ? '热门' : sortBy === 'newest' ? '最新' : sortBy === 'downloads' ? '下载量' : sortBy === 'likes' ? '点赞数' : '更新时间'}</span>
                <ArrowDownIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('trending')}>热门</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('newest')}>最新</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('updated')}>最近更新</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('downloads')}>下载量</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('likes')}>点赞数</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filterBy === 'all' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'all' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => setFilterBy('all')}
          >
            全部数据集
          </Button>
          <Button
            variant={filterBy === 'my-datasets' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'my-datasets' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => setFilterBy('my-datasets')}
          >
            我的数据集
          </Button>
          <Button
            variant={filterBy === 'liked' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'liked' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => setFilterBy('liked')}
          >
            已收藏
          </Button>
        </div>
      </div>

      {/* Dataset List */}
      <div className="space-y-4">
        {filteredDatasets.map((dataset) => (
          <Card key={dataset.id} className="border-[#d1dbe8] hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <DatabaseIcon className="w-5 h-5 text-[#1977e5] mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/datasets/${dataset.id}`}>
                          <h3 className="text-lg font-semibold text-[#0c141c] hover:text-[#1977e5] cursor-pointer">
                            {dataset.owner}/{dataset.name}
                          </h3>
                        </Link>
                        {dataset.featured && (
                          <Badge className="bg-[#ff6b35] text-white text-xs">推荐</Badge>
                        )}
                      </div>
                      <p className="text-[#4f7096] text-sm mb-3 line-clamp-2">
                        {dataset.description}
                      </p>
                      
                      {/* Tags */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getTaskTypeColor(dataset.taskType)}>
                          {dataset.taskType}
                        </Badge>
                        {dataset.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {dataset.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{dataset.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-6 text-sm text-[#4f7096]">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>更新于 {dataset.lastUpdated}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDriveIcon className="w-4 h-4" />
                          <span>{dataset.size}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DownloadIcon className="w-4 h-4" />
                          <span>{formatNumber(dataset.downloads)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HeartIcon className="w-4 h-4" />
                          <span>{dataset.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranchIcon className="w-4 h-4" />
                          <span>{dataset.versions} 个版本</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TagIcon className="w-4 h-4" />
                          <span>{dataset.license}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/datasets/${dataset.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#d1dbe8] h-8 px-3"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      预览
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#d1dbe8] h-8 px-3"
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    下载
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#d1dbe8] h-8 px-3"
                  >
                    <HeartIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center mt-8">
        <Button variant="outline" className="border-[#d1dbe8]">
          加载更多数据集
        </Button>
      </div>
    </div>
  );
};