import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import {
  GitBranch,
  GitCommit,
  Download,
  Upload,
  Copy,
  Star,
  Calendar,
  User,
  FileText,
  Diff,
  Plus,
  AlertCircle,
  File,
  Search
} from 'lucide-react';
import { enhancedDatasetService } from '../../services/enhanced-dataset.service';
import {
  EnhancedDatasetVersion,
  CreateDatasetVersionRequest,
  CloneVersionRequest,
  VersionType
} from '../../types/enhanced-dataset';

interface VersionManagerProps {
  datasetId: number;
  currentVersion?: EnhancedDatasetVersion;
  onVersionChange?: (version: EnhancedDatasetVersion) => void;
}

interface DatasetFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_size_formatted: string;
  version_info: {
    version: string;
    is_default: boolean;
    created_at: string;
  };
}

export const VersionManager: React.FC<VersionManagerProps> = ({
  datasetId,
  currentVersion,
  onVersionChange
}) => {
  const [versions, setVersions] = useState<EnhancedDatasetVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedExistingFileIds, setSelectedExistingFileIds] = useState<string[]>([]);
  const [availableFiles, setAvailableFiles] = useState<DatasetFile[]>([]);
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [creationMode, setCreationMode] = useState<'upload' | 'existing'>('upload');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneSourceVersion, setCloneSourceVersion] = useState<EnhancedDatasetVersion | null>(null);

  // 创建版本表单状态
  const [createForm, setCreateForm] = useState<CreateDatasetVersionRequest>({
    version: '',
    commit_message: '',
    author: '',
    version_type: 'minor',
    files: []
  });

  // 克隆版本表单状态
  const [cloneForm, setCloneForm] = useState<CloneVersionRequest>({
    new_version: '',
    commit_message: '',
    author: ''
  });

  useEffect(() => {
    loadVersions();
  }, [datasetId]);

  useEffect(() => {
    if (isCreateDialogOpen && creationMode === 'existing') {
      loadAvailableFiles();
    }
  }, [isCreateDialogOpen, creationMode, datasetId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const versionList = await enhancedDatasetService.getVersionTree(datasetId);
      setVersions(versionList);
    } catch (error) {
      console.error('加载版本列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFiles = async () => {
    try {
      setLoadingFiles(true);
      const response = await enhancedDatasetService.getAvailableFiles(datasetId, {
        page: 1,
        pageSize: 100, // 获取足够多的文件
        search: fileSearchTerm || undefined
      });
      setAvailableFiles(response.files || []);
    } catch (error) {
      console.error('加载可用文件失败:', error);
      setAvailableFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setCreateForm(prev => ({ ...prev, files }));
  };

  const handleExistingFileToggle = (fileId: string) => {
    setSelectedExistingFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleCreateVersion = async () => {
    try {
      setLoading(true);
      
      // 验证必填字段
      if (!createForm.version.trim()) {
        alert('版本号不能为空');
        return;
      }
      
      if (!createForm.author.trim()) {
        alert('作者不能为空');
        return;
      }
      
      // 验证文件选择
      if (creationMode === 'existing' && selectedExistingFileIds.length === 0) {
        alert('请选择至少一个现有文件');
        return;
      }
      
      if (creationMode === 'upload' && selectedFiles.length === 0) {
        alert('请选择至少一个文件上传');
        return;
      }
      
      let newVersion: EnhancedDatasetVersion;
      
      if (creationMode === 'upload') {
        // 传统上传模式
        newVersion = await enhancedDatasetService.createDatasetVersion(
          datasetId,
          createForm
        );
      } else {
        // 仅使用现有文件
        newVersion = await enhancedDatasetService.createVersionWithExistingFiles(
          datasetId,
          {
            version: createForm.version,
            commit_message: createForm.commit_message,
            author: createForm.author,
            version_type: createForm.version_type,
            existing_file_ids: selectedExistingFileIds
          }
        );
      }
      
      await loadVersions();
      setIsCreateDialogOpen(false);
      
      // 重置表单
      setCreateForm({
        version: '',
        commit_message: '',
        author: '',
        version_type: 'minor',
        files: []
      });
      setSelectedFiles([]);
      setSelectedExistingFileIds([]);
      setCreationMode('upload');
      
      if (onVersionChange) {
        onVersionChange(newVersion);
      }
    } catch (error) {
      console.error('创建版本失败:', error);
      alert('创建版本失败，请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneVersion = async () => {
    if (!cloneSourceVersion) return;
    
    try {
      setLoading(true);
      const newVersion = await enhancedDatasetService.cloneVersion(
        cloneSourceVersion.id,
        cloneForm
      );
      
      await loadVersions();
      setIsCloneDialogOpen(false);
      setCloneForm({
        new_version: '',
        commit_message: '',
        author: ''
      });
      setCloneSourceVersion(null);
      
      if (onVersionChange) {
        onVersionChange(newVersion);
      }
    } catch (error) {
      console.error('克隆版本失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (version: EnhancedDatasetVersion) => {
    try {
      setLoading(true);
      await enhancedDatasetService.setDefaultVersion(version.id);
      await loadVersions();
    } catch (error) {
      console.error('设置默认版本失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getVersionTypeColor = (type: VersionType) => {
    switch (type) {
      case 'major':
        return 'destructive';
      case 'minor':
        return 'default';
      case 'patch':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredFiles = availableFiles.filter(file =>
    file.filename.toLowerCase().includes(fileSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">版本管理</h3>
            <p className="text-sm text-gray-600">
              管理数据集版本，支持版本控制、比较和回退
            </p>
          </div>
          <div className="flex gap-2">
            {/* 创建新版本 */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  创建版本
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>创建新版本</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="version" className="text-sm font-medium">
                      版本号 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="version"
                      placeholder="如: v1.0.0"
                      value={createForm.version}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, version: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="version-type" className="text-sm font-medium">版本类型</label>
                    <Select 
                      value={createForm.version_type} 
                      onValueChange={(value) => setCreateForm(prev => ({ ...prev, version_type: value as VersionType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="major">主版本 (Major)</SelectItem>
                        <SelectItem value="minor">次版本 (Minor)</SelectItem>
                        <SelectItem value="patch">补丁版本 (Patch)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="author" className="text-sm font-medium">
                      作者 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="author"
                      placeholder="请输入作者姓名"
                      value={createForm.author}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, author: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="commit-message" className="text-sm font-medium">提交信息</label>
                    <Textarea
                      id="commit-message"
                      placeholder="描述此版本的变更内容"
                      value={createForm.commit_message}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, commit_message: e.target.value }))}
                    />
                  </div>
                  
                  {/* 文件来源选择 */}
                  <div>
                    <label className="text-sm font-medium">文件来源</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={creationMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCreationMode('upload')}
                      >
                        上传新文件
                      </Button>
                      <Button
                        type="button"
                        variant={creationMode === 'existing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCreationMode('existing')}
                      >
                        选择现有文件
                      </Button>
                    </div>
                  </div>
                  
                  {/* 现有文件选择 */}
                  {creationMode === 'existing' && (
                    <div>
                      <label className="text-sm font-medium">选择现有文件</label>
                      
                      {/* 搜索框 */}
                      <div className="mt-2 mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="搜索文件..."
                            value={fileSearchTerm}
                            onChange={(e) => {
                              setFileSearchTerm(e.target.value);
                              if (e.target.value !== fileSearchTerm) {
                                // 重新加载文件以应用搜索
                                setTimeout(() => loadAvailableFiles(), 300);
                              }
                            }}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      {/* 文件列表 */}
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {loadingFiles ? (
                          <div className="p-4 text-center text-gray-500">
                            加载文件列表...
                          </div>
                        ) : filteredFiles.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            {fileSearchTerm ? '未找到匹配的文件' : '暂无可用文件'}
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {filteredFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                              >
                                <Checkbox
                                  id={`file-${file.id}`}
                                  checked={selectedExistingFileIds.includes(file.id)}
                                  onCheckedChange={() => handleExistingFileToggle(file.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate">
                                      {file.filename}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {file.file_type}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {file.file_size_formatted} · 来源版本: {file.version_info.version}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {selectedExistingFileIds.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          已选择 {selectedExistingFileIds.length} 个文件
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 新文件上传 */}
                  {creationMode === 'upload' && (
                    <div>
                      <label htmlFor="files" className="text-sm font-medium">
                        上传文件 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="files"
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                      />
                      {selectedFiles.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm text-gray-600 mb-2">
                            已选择 {selectedFiles.length} 个文件:
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                <File className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{file.name}</span>
                                <span className="text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateVersion} disabled={loading}>
                      {loading ? '创建中...' : '创建版本'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        // 重置状态
                        setSelectedFiles([]);
                        setSelectedExistingFileIds([]);
                        setFileSearchTerm('');
                        setCreationMode('upload');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={loadVersions} disabled={loading}>
              刷新
            </Button>
          </div>
        </div>
      </Card>

      {/* 版本列表 */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-6">
            <div className="text-center">加载中...</div>
          </Card>
        ) : versions.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>暂无版本</p>
              <p className="text-sm mt-1">创建第一个版本来开始版本管理</p>
            </div>
          </Card>
        ) : (
          versions.map((version) => (
            <Card key={version.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold">{version.version}</h4>
                    <Badge variant={getVersionTypeColor(version.version_type)}>
                      {version.version_type}
                    </Badge>
                    {version.is_default && (
                      <Badge variant="default">
                        <Star className="w-3 h-3 mr-1" />
                        默认版本
                      </Badge>
                    )}
                    {version.is_draft && (
                      <Badge variant="outline">草稿</Badge>
                    )}
                    {version.is_deprecated && (
                      <Badge variant="destructive">已废弃</Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{version.commit_message}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <GitCommit className="w-4 h-4" />
                      <span className="font-mono">{version.commit_hash.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{version.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(version.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{version.file_count} 文件 · {version.total_size_formatted}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <div className="flex gap-2">
                    {!version.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(version)}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        设为默认
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCloneSourceVersion(version);
                        setIsCloneDialogOpen(true);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      克隆
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enhancedDatasetService.exportVersionInfo(version.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      导出
                    </Button>
                  </div>
                  
                  {currentVersion && currentVersion.id !== version.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: 实现版本比较功能
                        console.log('比较版本:', currentVersion.id, version.id);
                      }}
                    >
                      <Diff className="w-4 h-4 mr-1" />
                      与当前版本比较
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 克隆版本对话框 */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              克隆版本: {cloneSourceVersion?.version}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-version" className="text-sm font-medium">新版本号</label>
              <Input
                id="new-version"
                placeholder="如: v1.1.0"
                value={cloneForm.new_version}
                onChange={(e) => setCloneForm(prev => ({ ...prev, new_version: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="clone-author" className="text-sm font-medium">作者</label>
              <Input
                id="clone-author"
                placeholder="作者姓名"
                value={cloneForm.author}
                onChange={(e) => setCloneForm(prev => ({ ...prev, author: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="clone-message" className="text-sm font-medium">提交信息</label>
              <Textarea
                id="clone-message"
                placeholder="描述克隆的目的"
                value={cloneForm.commit_message}
                onChange={(e) => setCloneForm(prev => ({ ...prev, commit_message: e.target.value }))}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCloneVersion} disabled={loading}>
                {loading ? '克隆中...' : '克隆版本'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCloneDialogOpen(false)}
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 