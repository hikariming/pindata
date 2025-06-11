import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { authService, User, Role, Organization } from '../../../services/auth.service';
import { useAuth } from '../../../hooks/useAuth';
import { Users, Plus, Search, Filter, Edit, Trash2, Shield, Key, Eye, Clock, AlertTriangle } from 'lucide-react';

interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  phone: string;
  role_ids: string[];
  organization_ids: string[];
}

export const UserAdministration: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role_ids: [],
    organization_ids: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Check if user has admin permissions
  const canManageUsers = hasPermission('user.manage') || hasPermission('system.manage');

  useEffect(() => {
    if (canManageUsers) {
      loadData();
    }
  }, [canManageUsers]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersResponse, rolesResponse, orgsResponse] = await Promise.all([
        authService.getUsers(),
        authService.getRoles(),
        authService.getOrganizations()
      ]);
      
      setUsers(usersResponse.users);
      setRoles(rolesResponse);
      setOrganizations(orgsResponse);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setCreateForm(prev => ({ ...prev, password, confirmPassword: password }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      setIsSubmitting(true);
      await authService.createUser({
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        full_name: createForm.full_name,
        phone: createForm.phone,
        role_ids: createForm.role_ids,
        organization_ids: createForm.organization_ids
      });
      
      setShowCreateDialog(false);
      resetCreateForm();
      await loadData();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      await authService.deleteUser(selectedUser.id);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      const response = await authService.resetUserPassword(selectedUser.id);
      setGeneratedPassword(response.new_password);
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to reset password:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
      role_ids: [],
      organization_ids: []
    });
    setGeneratedPassword('');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    const matchesRole = roleFilter === 'all' || 
                       (user.roles?.some(role => role.id === roleFilter) || false);
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    const variant = status === 'ACTIVE' ? 'default' : 
                   status === 'SUSPENDED' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{t(`settings.admin.statusLabels.${status}`)}</Badge>;
  };

  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{t('common.noPermission')}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('settings.admin.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('settings.admin.title')}</h3>
          <p className="text-sm text-gray-600">{t('settings.admin.description')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settings.admin.addUser')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('settings.admin.userCount')}</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('settings.admin.activeUsers')}</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('settings.admin.suspendedUsers')}</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'SUSPENDED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('settings.admin.searchUsers')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('settings.admin.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings.admin.allStatuses')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('settings.admin.statusLabels.ACTIVE')}</SelectItem>
                  <SelectItem value="INACTIVE">{t('settings.admin.statusLabels.INACTIVE')}</SelectItem>
                  <SelectItem value="SUSPENDED">{t('settings.admin.statusLabels.SUSPENDED')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('settings.admin.filterByRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings.admin.allRoles')}</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.profile.username')}</TableHead>
                <TableHead>{t('settings.profile.email')}</TableHead>
                <TableHead>{t('settings.profile.fullName')}</TableHead>
                <TableHead>{t('settings.profile.roles')}</TableHead>
                <TableHead>{t('settings.profile.accountStatus')}</TableHead>
                <TableHead>{t('settings.profile.lastLogin')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles?.map(role => (
                        <Badge key={role.id} variant="outline" className="text-xs">
                          {role.name}
                        </Badge>
                      )) || '-'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    {user.last_login_at ? 
                      new Date(user.last_login_at).toLocaleDateString() : 
                      t('common.never')
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowResetPasswordDialog(true);
                        }}
                      >
                        <Key className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {t('settings.admin.noUsers')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('settings.admin.createUser.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t('settings.admin.createUser.username')}</label>
              <Input
                value={createForm.username}
                onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.admin.createUser.email')}</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.admin.createUser.fullName')}</label>
              <Input
                value={createForm.full_name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.admin.createUser.phone')}</label>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">{t('settings.admin.createUser.password')}</label>
                <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                  {t('settings.admin.createUser.generatePassword')}
                </Button>
              </div>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            {generatedPassword && (
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t('settings.admin.generatedPassword')}:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{generatedPassword}</code>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    {t('settings.admin.copyPassword')}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('settings.admin.createUser.cancel')}
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? t('common.creating') : t('settings.admin.createUser.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.admin.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('settings.admin.confirmDeleteMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? t('common.deleting') : t('settings.admin.deleteUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.admin.resetPassword')}</DialogTitle>
            <DialogDescription>
              {t('settings.admin.resetPasswordMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? t('common.processing') : t('settings.admin.resetPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};