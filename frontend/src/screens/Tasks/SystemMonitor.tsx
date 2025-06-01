import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  CpuIcon,
  HardDriveIcon,
  MonitorIcon,
  ThermometerIcon,
  WifiIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ActivityIcon,
  BarChart3Icon,
  ServerIcon,
  ZapIcon
} from 'lucide-react';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  gpu: {
    usage: number;
    memory: number;
    temperature: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    upload: number;
    download: number;
  };
  executors: {
    total: number;
    active: number;
    idle: number;
    error: number;
  };
}

export const SystemMonitor = (): JSX.Element => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isRealtime, setIsRealtime] = useState(true);

  useEffect(() => {
    // 模拟系统指标数据
    const updateMetrics = () => {
      const mockMetrics: SystemMetrics = {
        cpu: {
          usage: Math.random() * 40 + 30, // 30-70%
          cores: 16,
          temperature: Math.random() * 20 + 45 // 45-65°C
        },
        memory: {
          used: 24.5,
          total: 64,
          usage: (24.5 / 64) * 100
        },
        gpu: {
          usage: Math.random() * 50 + 40, // 40-90%
          memory: 8.2,
          temperature: Math.random() * 25 + 65 // 65-90°C
        },
        disk: {
          used: 1.2,
          total: 2.0,
          usage: (1.2 / 2.0) * 100
        },
        network: {
          upload: Math.random() * 50 + 10, // 10-60 MB/s
          download: Math.random() * 100 + 20 // 20-120 MB/s
        },
        executors: {
          total: 8,
          active: 3,
          idle: 4,
          error: 1
        }
      };
      setMetrics(mockMetrics);
    };

    updateMetrics();
    
    // 如果开启实时更新，每5秒刷新一次
    let interval: number;
    if (isRealtime) {
      interval = setInterval(updateMetrics, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealtime]);

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUsageTextColor = (usage: number) => {
    if (usage < 50) return 'text-green-600';
    if (usage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 60) return 'text-green-600';
    if (temp < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatSize = (size: number) => {
    if (size < 1) return `${(size * 1024).toFixed(1)} GB`;
    return `${size.toFixed(1)} TB`;
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#4f7096]">加载系统监控数据...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0c141c] mb-1">系统监控</h3>
          <p className="text-sm text-[#4f7096]">实时监控系统资源使用情况和任务执行器状态</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-[#4f7096]">
              {isRealtime ? '实时更新' : '已暂停'}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRealtime(!isRealtime)}
            className="border-[#d1dbe8]"
          >
            <ActivityIcon className="w-4 h-4 mr-2" />
            {isRealtime ? '暂停' : '启动'}
          </Button>
        </div>
      </div>

      {/* 系统资源监控 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU 监控 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CpuIcon className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-[#0c141c]">CPU</h4>
            </div>
            <span className={`text-sm font-medium ${getUsageTextColor(metrics.cpu.usage)}`}>
              {metrics.cpu.usage.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4f7096]">使用率</span>
                <span className="text-[#0c141c] font-medium">{metrics.cpu.usage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#e8edf2] rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(metrics.cpu.usage)}`}
                  style={{ width: `${metrics.cpu.usage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#4f7096]">核心数</span>
                <div className="text-[#0c141c] font-medium">{metrics.cpu.cores}</div>
              </div>
              <div>
                <span className="text-[#4f7096]">温度</span>
                <div className={`font-medium ${getTemperatureColor(metrics.cpu.temperature)}`}>
                  {metrics.cpu.temperature.toFixed(1)}°C
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 内存监控 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDriveIcon className="w-5 h-5 text-green-500" />
              <h4 className="font-medium text-[#0c141c]">内存</h4>
            </div>
            <span className={`text-sm font-medium ${getUsageTextColor(metrics.memory.usage)}`}>
              {metrics.memory.usage.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4f7096]">已使用</span>
                <span className="text-[#0c141c] font-medium">
                  {metrics.memory.used} GB / {metrics.memory.total} GB
                </span>
              </div>
              <div className="w-full bg-[#e8edf2] rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(metrics.memory.usage)}`}
                  style={{ width: `${metrics.memory.usage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#4f7096]">可用</span>
                <div className="text-[#0c141c] font-medium">
                  {(metrics.memory.total - metrics.memory.used).toFixed(1)} GB
                </div>
              </div>
              <div>
                <span className="text-[#4f7096]">使用率</span>
                <div className={`font-medium ${getUsageTextColor(metrics.memory.usage)}`}>
                  {metrics.memory.usage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* GPU 监控 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MonitorIcon className="w-5 h-5 text-purple-500" />
              <h4 className="font-medium text-[#0c141c]">GPU</h4>
            </div>
            <span className={`text-sm font-medium ${getUsageTextColor(metrics.gpu.usage)}`}>
              {metrics.gpu.usage.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4f7096]">使用率</span>
                <span className="text-[#0c141c] font-medium">{metrics.gpu.usage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#e8edf2] rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(metrics.gpu.usage)}`}
                  style={{ width: `${metrics.gpu.usage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#4f7096]">显存</span>
                <div className="text-[#0c141c] font-medium">{metrics.gpu.memory.toFixed(1)} GB</div>
              </div>
              <div>
                <span className="text-[#4f7096]">温度</span>
                <div className={`font-medium ${getTemperatureColor(metrics.gpu.temperature)}`}>
                  {metrics.gpu.temperature.toFixed(1)}°C
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 磁盘监控 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ServerIcon className="w-5 h-5 text-orange-500" />
              <h4 className="font-medium text-[#0c141c]">存储</h4>
            </div>
            <span className={`text-sm font-medium ${getUsageTextColor(metrics.disk.usage)}`}>
              {metrics.disk.usage.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4f7096]">已使用</span>
                <span className="text-[#0c141c] font-medium">
                  {formatSize(metrics.disk.used)} / {formatSize(metrics.disk.total)}
                </span>
              </div>
              <div className="w-full bg-[#e8edf2] rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(metrics.disk.usage)}`}
                  style={{ width: `${metrics.disk.usage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#4f7096]">可用空间</span>
                <div className="text-[#0c141c] font-medium">
                  {formatSize(metrics.disk.total - metrics.disk.used)}
                </div>
              </div>
              <div>
                <span className="text-[#4f7096]">使用率</span>
                <div className={`font-medium ${getUsageTextColor(metrics.disk.usage)}`}>
                  {metrics.disk.usage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 网络和执行器状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 网络监控 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <WifiIcon className="w-5 h-5 text-cyan-500" />
            <h4 className="font-medium text-[#0c141c]">网络流量</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-[#f7f9fc] rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {metrics.network.download.toFixed(1)}
              </div>
              <div className="text-xs text-[#4f7096]">下载 (MB/s)</div>
            </div>
            <div className="text-center p-4 bg-[#f7f9fc] rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {metrics.network.upload.toFixed(1)}
              </div>
              <div className="text-xs text-[#4f7096]">上传 (MB/s)</div>
            </div>
          </div>
        </Card>

        {/* 任务执行器状态 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <ZapIcon className="w-5 h-5 text-yellow-500" />
            <h4 className="font-medium text-[#0c141c]">任务执行器</h4>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 bg-[#f7f9fc] rounded-lg">
              <div className="text-lg font-bold text-[#0c141c] mb-1">
                {metrics.executors.total}
              </div>
              <div className="text-xs text-[#4f7096]">总数</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600 mb-1">
                {metrics.executors.active}
              </div>
              <div className="text-xs text-green-700">活跃</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600 mb-1">
                {metrics.executors.idle}
              </div>
              <div className="text-xs text-blue-700">空闲</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600 mb-1">
                {metrics.executors.error}
              </div>
              <div className="text-xs text-red-700">异常</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#e8edf2]">
            <div className="flex justify-between text-sm">
              <span className="text-[#4f7096]">执行器效率</span>
              <span className="text-[#0c141c] font-medium">
                {((metrics.executors.active / metrics.executors.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-[#e8edf2] rounded-full h-1.5 mt-1">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${(metrics.executors.active / metrics.executors.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </Card>
      </div>

      {/* 系统警告 */}
      {(metrics.cpu.usage > 90 || metrics.memory.usage > 90 || metrics.gpu.usage > 95) && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangleIcon className="w-5 h-5" />
            <span className="font-medium">系统资源警告</span>
          </div>
          <div className="text-sm text-red-600 mt-1">
            {metrics.cpu.usage > 90 && <div>• CPU使用率过高 ({metrics.cpu.usage.toFixed(1)}%)</div>}
            {metrics.memory.usage > 90 && <div>• 内存使用率过高 ({metrics.memory.usage.toFixed(1)}%)</div>}
            {metrics.gpu.usage > 95 && <div>• GPU使用率过高 ({metrics.gpu.usage.toFixed(1)}%)</div>}
            <div className="mt-2">建议：暂停部分任务或调整任务优先级</div>
          </div>
        </Card>
      )}
    </div>
  );
}; 