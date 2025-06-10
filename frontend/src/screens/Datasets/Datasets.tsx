import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { 
  ArrowDownIcon, 
  DatabaseIcon, 
  SearchIcon, 
  SlidersHorizontalIcon,
  PlusIcon,
  WandIcon,
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
      setError(err instanceof Error ? err.message : t('datasets.error'));
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
              {t('datasets.title')}
            </h2>
          </div>
          <Badge variant="secondary" className="text-[#4f7096] bg-[#f0f4f8]">
            {t('datasets.totalDatasets', { count: formatNumber(totalDatasets) })}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link to="/datasets/create-smart">
            <Button className="bg-gradient-to-r from-[#1977e5] to-[#1565c0] hover:from-[#1565c0] hover:to-[#0d47a1] flex items-center gap-2 relative">
              <WandIcon className="w-4 h-4" />
              {t('datasets.smartCreate')}
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                AI
              </span>
            </Button>
          </Link>
          <Link to="/datasets/create">
            <Button variant="outline" className="border-[#d1dbe8] flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              {t('datasets.createDataset')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4f7096] w-4 h-4" />
            <Input
              className="pl-9 border-[#d1dbe8] h-10"
              placeholder={t('datasets.searchPlaceholder')}
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
                <span>{t('datasets.taskType')}: {taskFilter === 'all' ? t('datasets.allTaskTypes') : taskFilter}</span>
                <SlidersHorizontalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('all')}>{t('datasets.allTaskTypes')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Natural Language Processing')}>{t('datasets.nlp')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Question Answering')}>{t('datasets.qa')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Text Classification')}>{t('datasets.textClassification')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Computer Vision')}>{t('datasets.computerVision')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTaskFilterChange('Code Generation')}>{t('datasets.codeGeneration')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-[#d1dbe8] px-4 flex items-center gap-2"
              >
                <span>{t('datasets.sorting')}: {sortBy === 'trending' ? t('datasets.sortByTrending') : sortBy === 'newest' ? t('datasets.sortByNewest') : sortBy === 'downloads' ? t('datasets.sortByDownloads') : sortBy === 'likes' ? t('datasets.sortByLikes') : t('datasets.sortByUpdated')}</span>
                <ArrowDownIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSortChange('trending')}>{t('datasets.sortByTrending')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('newest')}>{t('datasets.sortByNewest')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('updated')}>{t('datasets.sortByUpdated')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('downloads')}>{t('datasets.sortByDownloads')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('likes')}>{t('datasets.sortByLikes')}</DropdownMenuItem>
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
            {t('datasets.filterAll')}
          </Button>
          <Button
            variant={filterBy === 'my-datasets' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'my-datasets' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => handleFilterChange('my-datasets')}
          >
            {t('datasets.filterMyDatasets')}
          </Button>
          <Button
            variant={filterBy === 'liked' ? 'default' : 'outline'}
            className={`h-8 ${filterBy === 'liked' ? 'bg-[#1977e5]' : 'border-[#d1dbe8]'}`}
            onClick={() => handleFilterChange('liked')}
          >
            {t('datasets.filterLiked')}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="w-8 h-8 animate-spin text-[#1977e5]" />
          <span className="ml-2 text-[#4f7096]">{t('datasets.loading')}</span>
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
            {t('datasets.retry')}
          </Button>
        </div>
      )}

      {/* Dataset Grid - 双栏布局 */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <span className="text-[#4f7096]">{t('datasets.noDatasets')}</span>
            </div>
          ) : (
            datasets.map((dataset) => (
              <Link key={dataset.id} to={`/datasets/${dataset.id}`}>
                <Card className="border-[#d1dbe8] hover:shadow-md hover:border-[#1977e5] transition-all cursor-pointer h-full">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <DatabaseIcon className="w-5 h-5 text-[#1977e5] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-[#0c141c] truncate">
                            {dataset.owner}/{dataset.name}
                          </h3>
                          {dataset.featured && (
                            <Badge className="bg-[#ff6b35] text-white text-xs flex-shrink-0">{t('datasets.recommended')}</Badge>
                          )}
                        </div>
                        
                        {/* 任务类型标签 */}
                        <div className="mb-2">
                          <Badge className={getTaskTypeColor(dataset.taskType) + " text-xs"}>
                            {dataset.taskType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && datasets.length > 0 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-[#4f7096]">
            {t('datasets.pagination.showing', {
              start: (currentPage - 1) * perPage + 1,
              end: Math.min(currentPage * perPage, totalDatasets),
              total: totalDatasets
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              {t('datasets.pagination.previous')}
            </Button>
            <span className="text-sm px-3">
              {t('datasets.pagination.page', { current: currentPage, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              {t('datasets.pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};