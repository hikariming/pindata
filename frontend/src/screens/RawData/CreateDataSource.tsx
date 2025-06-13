import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { 
  XIcon, 
  DatabaseIcon, 
  CloudIcon,
  Loader2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  TestTubeIcon
} from 'lucide-react';
import { 
  DATABASE_TYPE_OPTIONS, 
  API_AUTH_TYPE_OPTIONS, 
  HTTP_METHOD_OPTIONS,
  type DataSourceType,
  type DatabaseType,
  type APIAuthType,
  type CreateDataSourceConfigRequest
} from '../../types/dataSource';
import { useDataSourceActions } from '../../hooks/useDataSources';

interface CreateDataSourceProps {
  sourceType: DataSourceType;
  onClose: () => void;
  onSuccess?: (config: any) => void;
  projectId?: string;
}

export const CreateDataSource: React.FC<CreateDataSourceProps> = ({
  sourceType,
  onClose,
  onSuccess,
  projectId
}) => {
  const { t } = useTranslation();
  const { createConfig, testConnection, loading, error } = useDataSourceActions();
  
  const [formData, setFormData] = useState<CreateDataSourceConfigRequest>({
    name: '',
    description: '',
    source_type: sourceType,
    project_id: projectId,
    database_config: sourceType === 'database_table' ? {
      database_type: 'mysql',
      host: '',
      port: 3306,
      database_name: '',
      username: '',
      password: '',
      table_name: ''
    } : undefined,
    api_config: sourceType === 'api_source' ? {
      api_url: '',
      api_method: 'GET',
      auth_type: 'none'
    } : undefined
  });
  
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDatabaseConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      database_config: {
        ...prev.database_config!,
        [field]: value
      }
    }));
  };

  const handleAPIConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      api_config: {
        ...prev.api_config!,
        [field]: value
      }
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.name) {
      alert('请先填写数据源名称');
      return;
    }

    setTesting(true);
    try {
      // 先创建配置（临时）
      const config = await createConfig(formData);
      if (config) {
        // 测试连接
        const result = await testConnection(config.id);
        setTestResult(result);
      }
    } catch (err) {
      console.error('Test connection failed:', err);
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请填写数据源名称');
      return;
    }

    try {
      const config = await createConfig(formData);
      if (config) {
        onSuccess?.(config);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create data source:', err);
    }
  };

  const isFormValid = () => {
    if (!formData.name) return false;
    
    if (sourceType === 'database_table') {
      const db = formData.database_config;
      return db?.host && db?.database_name && db?.username && db?.table_name;
    }
    
    if (sourceType === 'api_source') {
      const api = formData.api_config;
      return api?.api_url;
    }
    
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] bg-white border-[#d1dbe8] m-4 overflow-hidden">
        <div className="p-6 border-b border-[#d1dbe8]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {sourceType === 'database_table' ? (
                <DatabaseIcon className="w-6 h-6 text-[#1977e5]" />
              ) : (
                <CloudIcon className="w-6 h-6 text-[#1977e5]" />
              )}
              <h2 className="text-xl font-bold text-[#0c141c]">
                {sourceType === 'database_table' ? '添加数据库表' : '添加API数据源'}
              </h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-[#4f7096] hover:text-[#0c141c]"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#0c141c]">基本信息</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0c141c]">
                  数据源名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="请输入数据源名称"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="border-[#d1dbe8] focus:border-[#1977e5]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0c141c]">描述</label>
                <Textarea
                  placeholder="请输入数据源描述"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="border-[#d1dbe8] focus:border-[#1977e5] min-h-[80px]"
                />
              </div>
            </div>

            {/* 数据库配置 */}
            {sourceType === 'database_table' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#0c141c]">数据库配置</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">数据库类型</label>
                    <select 
                      value={formData.database_config?.database_type || 'mysql'}
                      onChange={(e) => handleDatabaseConfigChange('database_type', e.target.value as DatabaseType)}
                      className="w-full px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
                    >
                      {DATABASE_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">主机地址</label>
                    <Input
                      placeholder="localhost"
                      value={formData.database_config?.host || ''}
                      onChange={(e) => handleDatabaseConfigChange('host', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">端口</label>
                    <Input
                      type="number"
                      placeholder="3306"
                      value={formData.database_config?.port || ''}
                      onChange={(e) => handleDatabaseConfigChange('port', parseInt(e.target.value) || 3306)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">数据库名</label>
                    <Input
                      placeholder="database_name"
                      value={formData.database_config?.database_name || ''}
                      onChange={(e) => handleDatabaseConfigChange('database_name', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">用户名</label>
                    <Input
                      placeholder="username"
                      value={formData.database_config?.username || ''}
                      onChange={(e) => handleDatabaseConfigChange('username', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">密码</label>
                    <Input
                      type="password"
                      placeholder="password"
                      value={formData.database_config?.password || ''}
                      onChange={(e) => handleDatabaseConfigChange('password', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">表名</label>
                    <Input
                      placeholder="table_name"
                      value={formData.database_config?.table_name || ''}
                      onChange={(e) => handleDatabaseConfigChange('table_name', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">Schema（可选）</label>
                    <Input
                      placeholder="schema_name"
                      value={formData.database_config?.schema_name || ''}
                      onChange={(e) => handleDatabaseConfigChange('schema_name', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* API配置 */}
            {sourceType === 'api_source' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#0c141c]">API配置</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0c141c]">API URL</label>
                    <Input
                      placeholder="https://api.example.com/data"
                      value={formData.api_config?.api_url || ''}
                      onChange={(e) => handleAPIConfigChange('api_url', e.target.value)}
                      className="border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0c141c]">请求方法</label>
                      <select 
                        value={formData.api_config?.api_method || 'GET'}
                        onChange={(e) => handleAPIConfigChange('api_method', e.target.value)}
                        className="w-full px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
                      >
                        {HTTP_METHOD_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0c141c]">认证类型</label>
                      <select 
                        value={formData.api_config?.auth_type || 'none'}
                        onChange={(e) => handleAPIConfigChange('auth_type', e.target.value as APIAuthType)}
                        className="w-full px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
                      >
                        {API_AUTH_TYPE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 连接测试结果 */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircleIcon className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.success ? '连接成功' : '连接失败'}
                  </span>
                </div>
                {testResult.message && (
                  <p className={`text-sm ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </p>
                )}
                {testResult.error && (
                  <p className="text-sm text-red-700">{testResult.error}</p>
                )}
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="p-6 border-t border-[#d1dbe8] bg-[#f7f9fc]">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!isFormValid() || testing || loading}
              className="border-[#1977e5] text-[#1977e5] hover:bg-[#1977e5] hover:text-white"
            >
              {testing ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <TestTubeIcon className="w-4 h-4 mr-2" />
                  测试连接
                </>
              )}
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || loading}
                className="bg-[#1977e5] hover:bg-[#1977e5]/90"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建数据源'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};