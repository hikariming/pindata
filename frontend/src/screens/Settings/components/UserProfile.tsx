import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { useAuth } from '../../../hooks/useAuth';
import { User, Edit, Key, Shield, Users, Calendar } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword, isLoading } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    phone: user?.phone || ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await updateProfile(profileForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileForm({
      username: user?.username || '',
      email: user?.email || '',
      full_name: user?.full_name || '',
      phone: user?.phone || ''
    });
    setIsEditing(false);
  };

  const validatePassword = () => {
    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('settings.profile.passwordRequirements'));
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('settings.profile.passwordMismatch'));
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    
    try {
      setIsChangingPassword(true);
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordDialog(false);
    } catch (error) {
      setPasswordError(t('settings.profile.changePasswordError'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('settings.profile.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('settings.profile.title')}</h3>
          <p className="text-sm text-gray-600">{t('settings.profile.description')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Key className="w-4 h-4 mr-2" />
                {t('settings.profile.changePassword')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.profile.changePassword')}</DialogTitle>
                <DialogDescription>
                  {t('settings.profile.passwordRequirements')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('settings.profile.currentPassword')}</label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('settings.profile.newPassword')}</label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('settings.profile.confirmPassword')}</label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                {passwordError && (
                  <div className="text-sm text-red-600">{passwordError}</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? t('settings.profile.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelEdit} size="sm">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving} size="sm">
                {isSaving ? t('settings.profile.saving') : t('settings.profile.save')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              {t('settings.profile.personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('settings.profile.username')}</label>
              <Input
                value={profileForm.username}
                onChange={(e) => handleProfileChange('username', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.profile.email')}</label>
              <Input
                value={profileForm.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.profile.fullName')}</label>
              <Input
                value={profileForm.full_name}
                onChange={(e) => handleProfileChange('full_name', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.profile.phone')}</label>
              <Input
                value={profileForm.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              {t('settings.profile.accountInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('settings.profile.accountStatus')}</span>
              <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {user.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('settings.profile.memberSince')}</span>
              <span className="text-sm text-gray-600">
                {formatDate(user.created_at)}
              </span>
            </div>
            {user.last_login_at && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('settings.profile.lastLogin')}</span>
                <span className="text-sm text-gray-600">
                  {formatDate(user.last_login_at)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organizations */}
        {user.organizations && user.organizations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {t('settings.profile.organizations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user.organizations.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-600">{org.code}</div>
                      {org.position && (
                        <div className="text-xs text-gray-500">{org.position}</div>
                      )}
                    </div>
                    {org.is_primary && (
                      <Badge variant="outline">{t('common.primary')}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roles */}
        {user.roles && user.roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                {t('settings.profile.roles')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};