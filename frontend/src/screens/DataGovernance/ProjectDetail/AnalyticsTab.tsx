import React from 'react';
import { 
  BarChart3Icon, 
  TrendingUpIcon, 
  UsersIcon, 
  AlertCircleIcon 
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { DataGovernanceProject } from '../types';

interface AnalyticsTabProps {
  project: DataGovernanceProject;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ project }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">数据分析</h3>
          <Button variant="outline" size="sm">
            <BarChart3Icon size={16} className="mr-2" />
            生成报告
          </Button>
        </div>
        <p className="text-gray-600 mb-4">
          基于治理后数据进行的各类分析报告和洞察。
        </p>
        
        <div className="grid grid-cols-2 gap-6">
          {/* 质量评估报告 */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <BarChart3Icon size={24} className="text-blue-600" />
                <h4 className="font-medium text-blue-800">数据质量趋势</h4>
              </div>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                AI评估
              </Badge>
            </div>
            <p className="text-sm text-blue-600 mb-3">过去30天数据质量变化趋势及AI驱动的改进建议</p>
            
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="text-center">
                <div className="text-blue-800 font-medium">完整性</div>
                <div className="text-blue-600">95%</div>
              </div>
              <div className="text-center">
                <div className="text-blue-800 font-medium">准确性</div>
                <div className="text-blue-600">92%</div>
              </div>
              <div className="text-center">
                <div className="text-blue-800 font-medium">一致性</div>
                <div className="text-blue-600">89%</div>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full mt-2">
              查看详细报告
            </Button>
          </Card>

          {/* 处理效率分析 */}
          <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUpIcon size={24} className="text-green-600" />
              <h4 className="font-medium text-green-800">处理效率分析</h4>
            </div>
            <p className="text-sm text-green-600 mb-3">数据处理速度和资源使用情况分析</p>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <div className="text-green-800 font-medium">平均处理时间</div>
                <div className="text-green-600">2.3 小时</div>
              </div>
              <div>
                <div className="text-green-800 font-medium">资源利用率</div>
                <div className="text-green-600">78%</div>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full mt-2">
              查看详细分析
            </Button>
          </Card>

          {/* 数据使用统计 */}
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <UsersIcon size={24} className="text-purple-600" />
              <h4 className="font-medium text-purple-800">数据使用统计</h4>
            </div>
            <p className="text-sm text-purple-600 mb-3">各业务部门数据访问和使用情况</p>
            
            <div className="space-y-1 text-xs mb-3">
              <div className="flex justify-between">
                <span className="text-purple-700">营销部门</span>
                <span className="text-purple-600">45%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">数据团队</span>
                <span className="text-purple-600">30%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">业务分析</span>
                <span className="text-purple-600">25%</span>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full mt-2">
              查看详细统计
            </Button>
          </Card>

          {/* 异常检测报告 */}
          <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <AlertCircleIcon size={24} className="text-orange-600" />
                <h4 className="font-medium text-orange-800">异常检测报告</h4>
              </div>
              <Badge variant="destructive" className="text-xs">
                3个异常
              </Badge>
            </div>
            <p className="text-sm text-orange-600 mb-3">数据异常和质量问题分析</p>
            
            <div className="space-y-1 text-xs mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-orange-700">重复数据检测到</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-orange-700">格式不一致</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-orange-700">缺失值增加</span>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full mt-2">
              查看详细报告
            </Button>
          </Card>
        </div>
      </Card>
    </div>
  );
}; 