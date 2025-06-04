import React, { useState, useEffect, useCallback } from 'react';
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
  HardDriveIcon,
  Loader2Icon,
  AlertCircleIcon
} from 'lucide-react';

// 导入数据集相关的类型和服务
import { Dataset, DatasetQueryParams } from '../../types/dataset';
import { datasetService } from '../../services/dataset.service';

export const Datasets = (): JSX.Element => {
  const { t } = useTranslation();
  
  // 状态管理
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'downloads' | 'likes' | 'updated'>('trending');
  const [filterBy, setFilterBy] = useState<'all' | 'my-datasets' | 'liked'>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const perPage = 10;

  // 获取数据集列表
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: DatasetQueryParams = {
        page: currentPage,
        per_page: perPage,
        sort_by: sortBy,
        filter_by: filterBy,
      };

      // 添加搜索条件
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // 添加任务类型筛选
      if (taskFilter !== 'all') {
        params.task_type = taskFilter;
      }

      const response = await datasetService.getDatasets(params);
      
      setDatasets(response.datasets);
      setTotalPages(response.pages);
      setTotalDatasets(response.total);
      setHasNext(response.has_next);
      setHasPrev(response.has_prev);
      
    } catch (err) {
      console.error('获取数据集失败:', err);
      setError(err instanceof Error ? err.message : '获取数据集失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, filterBy, searchQuery, taskFilter]);

  // 处理点赞
  const handleLike = async (datasetId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const response = await datasetService.likeDataset(datasetId);
      
      // 更新本地状态
      setDatasets(prev => prev.map(dataset => 
        dataset.id === datasetId 
          ? { ...dataset, likes: response.likes }
          : dataset
      ));
      
      // 可以添加成功提示
      console.log(response.message);
      
    } catch (err) {
      console.error('点赞失败:', err);
      // 可以添加错误提示
    }
  };

  // 处理下载
  const handleDownload = async (datasetId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const response = await datasetService.downloadDataset(datasetId);
      
      // 更新本地状态
      setDatasets(prev => prev.map(dataset => 
        dataset.id === datasetId 
          ? { ...dataset, downloads: response.downloads }
          : dataset
      ));
      
      // 如果有下载链接，可以打开新窗口下载
      if (response.download_url) {
        window.open(response.download_url, '_blank');
      }
      
      console.log(response.message);
      
    } catch (err) {
      console.error('下载失败:', err);
    }
  };

  // 搜索处理
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setCurrentPage(1); // 重置到第一页
    fetchDatasets();
  };

  // 排序变化
  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  // 筛选变化
  const handleFilterChange = (newFilterBy: typeof filterBy) => {
    setFilterBy(newFilterBy);
    setCurrentPage(1);
  };

  // 任务类型筛选变化
  const handleTaskFilterChange = (newTaskFilter: string) => {
    setTaskFilter(newTaskFilter);
    setCurrentPage(1);
  };

  // 分页变化
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // 获取任务类型颜色
  const getTaskTypeColor = (taskType: string): string => {
    const colors: { [key: string]: string } = {
      'Natural Language Processing': 'bg-blue-100 text-blue-800',
      'Question Answering': 'bg-green-100 text-green-800',
      'Text Classification': 'bg-purple-100 text-purple-800',
      'Computer Vision': 'bg-orange-100 text-orange-800',
      'Code Generation': 'bg-indigo-100 text-indigo-800',
      'Audio': 'bg-pink-100 text-pink-800'
    };
    return colors[taskType] || 'bg-gray-100 text-gray-800';
  };

  // 初始加载数据
  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

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
            {formatNumber(totalDatasets)} 个数据集
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
        <form onSubmit={handleSearch} className="flex gap-4">
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
              <DropdownMenuItem onClick={() => handleTaskFilterChange('all')}>全部</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Natural Language Processing')}>自然语言处理</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Question Answering')}>问答系统</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Text Classification')}>文本分类</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Computer Vision')}>计算机视觉</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Code Generation')}>代码生成</DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => handleSortChange('trending')}>热门</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('newest')}>最新</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('updated')}>最近更新</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('downloads')}>下载量</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('likes')}>点赞数</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </form>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filterBy === 'all' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'all' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => handleFilterChange('all')}
          >
            全部数据集
          </Button>
          <Button
            variant={filterBy === 'my-datasets' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'my-datasets' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => handleFilterChange('my-datasets')}
          >
            我的数据集
          </Button>
          <Button
            variant={filterBy === 'liked' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'liked' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => handleFilterChange('liked')}
          >
            已收藏
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="w-8 h-8 animate-spin text-[#1977e5]" />
          <span className="ml-2 text-[#4f7096]">加载中...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <AlertCircleIcon className="w-6 h-6 text-red-500 mr-2" />
          <span className="text-red-600">{error}</span>
          <Button 
            variant="outline" 
            className="ml-4"
            onClick={() => fetchDatasets()}
          >
            重试
          </Button>
        </div>
      )}

      {/* Dataset List */}
      {!loading && !error && (
        <div className="space-y-4">
          {datasets.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-[#4f7096]">没有找到数据集</span>
            </div>
          ) : (
            datasets.map((dataset) => (
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
                            {dataset.license && (
                              <div className="flex items-center gap-1">
                                <TagIcon className="w-4 h-4" />
                                <span>{dataset.license}</span>
                              </div>
                            )}
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
                        onClick={(e) => handleDownload(dataset.id, e)}
                      >
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        下载
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#d1dbe8] h-8 px-3"
                        onClick={(e) => handleLike(dataset.id, e)}
                      >
                        <HeartIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && datasets.length > 0 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-[#4f7096]">
            显示第 {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, totalDatasets)} 条，
            共 {totalDatasets} 条数据集
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              上一页
            </Button>
            <span className="text-sm px-3">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};