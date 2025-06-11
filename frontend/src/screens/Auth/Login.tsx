import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 清除错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = t('auth.validation.usernameRequired', '用户名不能为空');
    }
    
    if (!formData.password) {
      newErrors.password = t('auth.validation.passwordRequired', '密码不能为空');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login({
        username: formData.username,
        password: formData.password,
        device_info: navigator.userAgent
      });
      
      // 登录成功后跳转到主页
      navigate('/', { replace: true });
    } catch (error: any) {
      setErrors({
        submit: error.message || t('auth.errors.loginFailed', '登录失败，请检查用户名和密码')
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('auth.login.title', '登录 PinData')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.login.subtitle', '数据治理管理平台')}
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.submit}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                {t('auth.fields.username', '用户名/邮箱')}
              </label>
              <div className="mt-1">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                  placeholder={t('auth.placeholders.username', '请输入用户名或邮箱')}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.fields.password', '密码')}
              </label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                  placeholder={t('auth.placeholders.password', '请输入密码')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                  {t('auth.login.rememberMe', '记住我')}
                </label>
              </div>

              <div className="text-sm">
                <Link 
                  to="/auth/forgot-password" 
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('auth.login.forgotPassword', '忘记密码？')}
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('auth.login.loggingIn', '登录中...')}
                  </div>
                ) : (
                  t('auth.login.submit', '登录')
                )}
              </Button>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                {t('auth.login.noAccount', '还没有账号？')}
                <Link 
                  to="/auth/register" 
                  className="ml-1 font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('auth.login.registerLink', '立即注册')}
                </Link>
              </span>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>{t('auth.footer.copyright', '© 2024 PinData. All rights reserved.')}</p>
        </div>
      </div>
    </div>
  );
};