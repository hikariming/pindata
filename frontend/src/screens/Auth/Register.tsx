import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    agreeTerms: false
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
    } else if (formData.username.length < 3) {
      newErrors.username = t('auth.validation.usernameMinLength', '用户名至少3个字符');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = t('auth.validation.usernameFormat', '用户名只能包含字母、数字和下划线');
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('auth.validation.emailRequired', '邮箱不能为空');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.validation.emailInvalid', '邮箱格式不正确');
    }
    
    if (!formData.password) {
      newErrors.password = t('auth.validation.passwordRequired', '密码不能为空');
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.validation.passwordMinLength', '密码至少6个字符');
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.validation.passwordMismatch', '两次输入的密码不一致');
    }
    
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = t('auth.validation.agreeTermsRequired', '请同意服务条款');
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
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName || undefined,
        phone: formData.phone || undefined,
        device_info: navigator.userAgent
      });
      
      if (result?.autoLogin) {
        // 首个用户自动登录，跳转到主页
        navigate('/', { 
          replace: true,
          state: { 
            message: t('auth.register.firstUserSuccess', '欢迎！您是第一个用户，已自动获得管理员权限') 
          }
        });
      } else {
        // 普通注册，跳转到登录页
        navigate('/auth/login', { 
          replace: true,
          state: { 
            message: t('auth.register.success', '注册成功，请登录') 
          }
        });
      }
    } catch (error: any) {
      setErrors({
        submit: error.message || t('auth.errors.registerFailed', '注册失败，请重试')
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('auth.register.title', '注册 PinData')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.register.subtitle', '创建您的数据治理账户')}
          </p>
        </div>

        {/* Register Form */}
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  {t('auth.fields.username', '用户名')} *
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
                    placeholder={t('auth.placeholders.username', '请输入用户名')}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('auth.fields.email', '邮箱')} *
                </label>
                <div className="mt-1">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                    placeholder={t('auth.placeholders.email', '请输入邮箱地址')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  {t('auth.fields.fullName', '姓名')}
                </label>
                <div className="mt-1">
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={t('auth.placeholders.fullName', '请输入真实姓名')}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  {t('auth.fields.phone', '手机号')}
                </label>
                <div className="mt-1">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('auth.placeholders.phone', '请输入手机号')}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('auth.fields.password', '密码')} *
                </label>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  {t('auth.fields.confirmPassword', '确认密码')} *
                </label>
                <div className="mt-1">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                    placeholder={t('auth.placeholders.confirmPassword', '请再次输入密码')}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div>
              <div className="flex items-center">
                <input
                  id="agreeTerms"
                  name="agreeTerms"
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                    errors.agreeTerms ? 'border-red-300' : ''
                  }`}
                />
                <label htmlFor="agreeTerms" className="ml-2 block text-sm text-gray-900">
                  {t('auth.register.agreeTerms', '我同意')}
                  <Link 
                    to="/terms" 
                    className="text-blue-600 hover:text-blue-500"
                    target="_blank"
                  >
                    {t('auth.register.termsOfService', '服务条款')}
                  </Link>
                  {t('auth.register.and', '和')}
                  <Link 
                    to="/privacy" 
                    className="text-blue-600 hover:text-blue-500"
                    target="_blank"
                  >
                    {t('auth.register.privacyPolicy', '隐私政策')}
                  </Link>
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="mt-1 text-sm text-red-600">{errors.agreeTerms}</p>
              )}
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
                    {t('auth.register.registering', '注册中...')}
                  </div>
                ) : (
                  t('auth.register.submit', '注册')
                )}
              </Button>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                {t('auth.register.hasAccount', '已有账号？')}
                <Link 
                  to="/auth/login" 
                  className="ml-1 font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('auth.register.loginLink', '立即登录')}
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