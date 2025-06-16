import React, { useState } from 'react';
import { 
  UserIcon, 
  UserPlusIcon, 
  MoreVerticalIcon, 
  MailIcon, 
  CalendarIcon,
  CrownIcon,
  ShieldIcon,
  EditIcon,
  EyeIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Dialog } from '../../../components/ui/dialog';
import { ProjectMember, ProjectRole } from '../types';

interface TeamManagementProps {
  team: ProjectMember[];
  currentUserId: string;
  onAddMember?: (email: string, role: ProjectMember['role']) => void;
  onUpdateMemberRole?: (memberId: string, role: ProjectMember['role']) => void;
  onRemoveMember?: (memberId: string) => void;
}

const roleConfig: { [key in ProjectMember['role']]: { 
  label: string; 
  color: string; 
  icon: React.ComponentType<any>;
  permissions: string[];
  description: string;
} } = {
  owner: {
    label: '所有者',
    color: 'bg-purple-100 text-purple-800',
    icon: CrownIcon,
    permissions: ['全部权限'],
    description: '拥有项目的完全控制权'
  },
  admin: {
    label: '管理员',
    color: 'bg-blue-100 text-blue-800',
    icon: ShieldIcon,
    permissions: ['管理成员', '配置管道', '查看数据', '编辑项目'],
    description: '可以管理团队和项目配置'
  },
  editor: {
    label: '编辑者',
    color: 'bg-green-100 text-green-800',
    icon: EditIcon,
    permissions: ['编辑数据', '运行管道', '查看报告'],
    description: '可以编辑和处理项目数据'
  },
  viewer: {
    label: '查看者',
    color: 'bg-gray-100 text-gray-800',
    icon: EyeIcon,
    permissions: ['查看数据', '查看报告'],
    description: '仅可查看项目内容'
  },
};

const mockTeam: ProjectMember[] = [
  {
    id: '1',
    username: 'zhangsan',
    fullName: '张三',
    email: 'zhangsan@company.com',
    role: 'owner',
    joinedAt: '2024-01-15',
  },
  {
    id: '2',
    username: 'lisi',
    fullName: '李四',
    email: 'lisi@company.com',
    role: 'admin',
    joinedAt: '2024-01-16',
  },
  {
    id: '3',
    username: 'wangwu',
    fullName: '王五',
    email: 'wangwu@company.com',
    role: 'editor',
    joinedAt: '2024-01-20',
  },
  {
    id: '4',
    username: 'zhaoliu',
    fullName: '赵六',
    email: 'zhaoliu@company.com',
    role: 'viewer',
    joinedAt: '2024-02-01',
  },
];

export const TeamManagement: React.FC<TeamManagementProps> = ({
  team = mockTeam,
  currentUserId = '1',
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectMember['role']>('viewer');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<ProjectMember['role']>('viewer');

  const currentUser = team.find(m => m.id === currentUserId);
  const canManageTeam = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const filteredTeam = team.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleInvite = () => {
    if (inviteEmail) {
      onAddMember?.(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('viewer');
      setShowInviteDialog(false);
    }
  };

  const handleRoleUpdate = (memberId: string) => {
    onUpdateMemberRole?.(memberId, newRole);
    setEditingMember(null);
  };

  const getRoleStats = () => {
    const stats = team.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  };

  const roleStats = getRoleStats();

  return (
    <div className="space-y-6">
      {/* 团队概览 */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">团队管理</h3>
            <p className="text-gray-600">管理项目成员和权限设置</p>
          </div>
          {canManageTeam && (
            <Button 
              onClick={() => setShowInviteDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <UserPlusIcon size={16} className="mr-2" />
              邀请成员
            </Button>
          )}
        </div>

        {/* 角色统计 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(roleConfig).map(([role, config]) => {
            const count = roleStats[role] || 0;
            const Icon = config.icon;
            return (
              <div key={role} className="bg-white/80 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-600">{config.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
            );
          })}
        </div>

        {/* 搜索和过滤 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索成员姓名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <option value="all">全部角色</option>
            <option value="owner">所有者</option>
            <option value="admin">管理员</option>
            <option value="editor">编辑者</option>
            <option value="viewer">查看者</option>
          </Select>
        </div>
      </Card>

      {/* 成员列表 */}
      <div className="grid gap-4">
        {filteredTeam.map((member) => {
          const config = roleConfig[member.role];
          const Icon = config.icon;
          const isCurrentUser = member.id === currentUserId;
          const canEditThisMember = canManageTeam && !isCurrentUser && member.role !== 'owner';
          const isEditing = editingMember === member.id;
          
          return (
            <Card key={member.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 头像 */}
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                    {member.fullName.charAt(0)}
                  </div>
                  
                  {/* 成员信息 */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-semibold text-gray-900">{member.fullName}</h4>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          您
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MailIcon size={12} />
                        {member.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={12} />
                        加入于 {formatDate(member.joinedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 角色和操作 */}
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={newRole}
                        onValueChange={(value) => setNewRole(value as ProjectMember['role'])}
                      >
                        {Object.entries(roleConfig).map(([role, config]) => (
                          role !== 'owner' && (
                            <option key={role} value={role}>{config.label}</option>
                          )
                        ))}
                      </Select>
                      <Button size="sm" onClick={() => handleRoleUpdate(member.id)}>
                        <CheckIcon size={14} />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingMember(null)}>
                        <XIcon size={14} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Badge className={`${config.color} flex items-center gap-1`}>
                        <Icon size={12} />
                        {config.label}
                      </Badge>
                      
                      {canEditThisMember && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMember(member.id);
                              setNewRole(member.role);
                            }}
                          >
                            <EditIcon size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemoveMember?.(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon size={14} />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 权限说明 */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                <div className="flex flex-wrap gap-2">
                  {config.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTeam.length === 0 && (
        <div className="text-center py-8">
          <UserIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">未找到成员</h3>
          <p className="text-gray-600">请尝试调整搜索条件</p>
        </div>
      )}

      {/* 邀请成员对话框 */}
      {showInviteDialog && (
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">邀请新成员</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址
                </label>
                <Input
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色权限
                </label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as ProjectMember['role'])}>
                  {Object.entries(roleConfig).map(([role, config]) => (
                    role !== 'owner' && (
                      <option key={role} value={role}>{config.label}</option>
                    )
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {roleConfig[inviteRole].description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                取消
              </Button>
              <Button onClick={handleInvite} disabled={!inviteEmail}>
                发送邀请
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};