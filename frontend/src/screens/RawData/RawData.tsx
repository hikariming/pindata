import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { 
  FolderIcon, 
  PlusIcon, 
  MoreVerticalIcon, 
  EyeIcon, 
  TrashIcon,
  FileTextIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Settings2Icon
} from 'lucide-react';
import { CreateLibrary } from './CreateLibrary';
import { LibraryDetails } from './LibraryDetails';

interface Library {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  lastUpdated: string;
  totalSize: string;
  processedCount: number;
  processingCount: number;
  pendingCount: number;
  mdCount: number;
  dataType: 'training' | 'evaluation' | 'mixed';
  tags: string[];
}

interface DataStatistics {
  totalLibraries: number;
  totalFiles: number;
  totalProcessed: number;
  totalSize: string;
  conversionRate: number;
}

type View = 'list' | 'create' | 'details';

export const RawData = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  
  // 模拟数据统计
  const [statistics] = useState<DataStatistics>({
    totalLibraries: 4,
    totalFiles: 85,
    totalProcessed: 62,
    totalSize: '2.8 GB',
    conversionRate: 73
  });

  const [libraries] = useState<Library[]>([
    {
      id: '1',
      name: '研究论文库',
      description: '收集的AI相关研究论文，用于训练科研文档理解模型',
      fileCount: 25,
      lastUpdated: '2024-03-15',
      totalSize: '156 MB',
      processedCount: 20,
      processingCount: 3,
      pendingCount: 2,
      mdCount: 20,
      dataType: 'training',
      tags: ['论文', 'AI', '科研']
    },
    {
      id: '2',
      name: '技术文档库',
      description: '软件开发文档和API文档，用于代码生成模型训练',
      fileCount: 18,
      lastUpdated: '2024-03-14',
      totalSize: '89 MB',
      processedCount: 15,
      processingCount: 2,
      pendingCount: 1,
      mdCount: 15,
      dataType: 'training',
      tags: ['文档', '开发', 'API']
    },
    {
      id: '3',
      name: '法律文件库',
      description: '法律合同和条款文档，用于法律AI助手训练',
      fileCount: 12,
      lastUpdated: '2024-03-10',
      totalSize: '234 MB',
      processedCount: 8,
      processingCount: 1,
      pendingCount: 3,
      mdCount: 8,
      dataType: 'evaluation',
      tags: ['法律', '合同', '条款']
    },
    {
      id: '4',
      name: '商业报告库',
      description: '企业财报和市场分析报告，用于商业分析模型',
      fileCount: 30,
      lastUpdated: '2024-03-05',
      totalSize: '445 MB',
      processedCount: 19,
      processingCount: 4,
      pendingCount: 7,
      mdCount: 19,
      dataType: 'mixed',
      tags: ['财报', '商业', '分析']
    },
  ]);

  const handleViewLibrary = (library: Library) => {
    setSelectedLibrary(library);
    setView('details');
  };

  const handleFileSelect = (file: any) => {
    navigate(`/rawdata/file/${file.id}`);
  };

  const getDataTypeColor = (dataType: Library['dataType']) => {
    switch (dataType) {
      case 'training':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'evaluation':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'mixed':
        return 'text-purple-600 bg-purple-50 border-purple-200';
    }
  };

  const getDataTypeLabel = (dataType: Library['dataType']) => {
    switch (dataType) {
      case 'training':
        return '训练数据';
      case 'evaluation':
        return '评估数据';
      case 'mixed':
        return '混合数据';
    }
  };

  if (view === 'create') {
    return <CreateLibrary onBack={() => setView('list')} />;
  }

  if (view === 'details' && selectedLibrary) {
    return (
      <LibraryDetails 
        onBack={() => setView('list')} 
        library={selectedLibrary}
        onFileSelect={handleFileSelect}
      />
    );
  }

  return (
    <div className="w-full max-w-[1400px] p-6">
      {/* 页面标题和操作按钮 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-8 text-[#0c141c] mb-2">训练数据管理</h1>
        <p className="text-[#4f7096] mb-4">管理多源异构数据，批量转换为Markdown格式，用于大模型训练和数据蒸馏</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 px-4 bg-[#1977e5] hover:bg-[#1977e5]/90"
            onClick={() => setView('create')}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            创建数据库
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
          >
            <Settings2Icon className="w-4 h-4 mr-2" />
            转换设置
          </Button>
        </div>
      </div>

      {/* 数据统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FolderIcon className="w-8 h-8 text-[#1977e5] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">数据库总数</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.totalLibraries}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FileTextIcon className="w-8 h-8 text-[#10b981] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">文件总数</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.totalFiles}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-[#10b981] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">已处理</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.totalProcessed}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <TrendingUpIcon className="w-8 h-8 text-[#8b5cf6] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">转换率</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.conversionRate}%</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <AlertCircleIcon className="w-8 h-8 text-[#f59e0b] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">总大小</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.totalSize}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 数据库列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">数据库列表</h2>
          <div className="text-sm text-[#4f7096]">
            共 {libraries.length} 个数据库
          </div>
        </div>
        
        <Card className="border-[#d1dbe8] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-[#d1dbe8] hover:bg-transparent">
                <TableHead className="text-[#4f7096] font-medium">数据库信息</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[120px]">数据类型</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[140px]">处理进度</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[100px]">文件数量</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[100px]">总大小</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[120px]">最后更新</TableHead>
                <TableHead className="text-[#4f7096] font-medium w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {libraries.map((library) => (
                <TableRow 
                  key={library.id} 
                  className="border-[#d1dbe8] hover:bg-[#f7f9fc] cursor-pointer"
                  onClick={() => handleViewLibrary(library)}
                >
                  <TableCell className="py-4">
                    <div className="flex items-start">
                      <FolderIcon className="w-5 h-5 mr-3 text-[#1977e5] mt-0.5" />
                      <div>
                        <div className="font-medium text-[#0c141c] mb-1">{library.name}</div>
                        <div className="text-sm text-[#4f7096] mb-2">{library.description}</div>
                        <div className="flex gap-1">
                          {library.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="inline-block px-2 py-0.5 text-xs bg-[#e8edf2] text-[#4f7096] rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getDataTypeColor(library.dataType)}`}>
                      {getDataTypeLabel(library.dataType)}
                    </span>
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#4f7096]">已完成</span>
                        <span className="text-[#0c141c] font-medium">
                          {Math.round((library.processedCount / library.fileCount) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                        <div 
                          className="bg-[#10b981] h-1.5 rounded-full" 
                          style={{ width: `${(library.processedCount / library.fileCount) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-[#4f7096]">
                        <span>已处理: {library.processedCount}</span>
                        <span>处理中: {library.processingCount}</span>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <div className="text-center">
                      <div className="text-[#0c141c] font-medium">{library.fileCount}</div>
                      <div className="text-xs text-[#4f7096]">MD: {library.mdCount}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4 text-[#4f7096]">{library.totalSize}</TableCell>
                  
                  <TableCell className="py-4">
                    <div className="flex items-center text-[#4f7096]">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      {library.lastUpdated}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4">
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
                          <span>查看详情</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-[#0c141c]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Settings2Icon className="mr-2 h-4 w-4" />
                          <span>编辑设置</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer text-red-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          <span>删除</span>
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