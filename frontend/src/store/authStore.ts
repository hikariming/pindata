import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  authService, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  ChangePasswordRequest,
  UserSession 
} from '../services/auth.service';

interface AuthState {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  sessionId: string | null;
  
  // 操作
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  
  // 会话管理
  getSessions: () => Promise<UserSession[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  
  // 权限检查
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // 初始化和清理
  initialize: () => Promise<void>;
  clear: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
      sessionId: null,

      // 登录
      login: async (data: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(data);
          
          // 存储令牌
          authService.storeTokens(
            response.tokens.access_token, 
            response.tokens.refresh_token
          );
          authService.storeUser(response.user);
          authService.setAuthToken(response.tokens.access_token);

          set({
            user: response.user,
            isAuthenticated: true,
            permissions: response.permissions,
            sessionId: response.tokens.session_id,
            isLoading: false
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || error.message || '登录失败');
        }
      },

      // 注册
      register: async (data: RegisterRequest) => {
        set({ isLoading: true });
        try {
          const response = await authService.register(data);
          
          // 检查是否是首个用户且已自动登录
          if (response.tokens) {
            // 首个用户自动登录，存储令牌和用户信息
            authService.storeTokens(
              response.tokens.access_token, 
              response.tokens.refresh_token
            );
            authService.storeUser(response.user);
            authService.setAuthToken(response.tokens.access_token);

            set({
              user: response.user,
              isAuthenticated: true,
              permissions: response.permissions || [],
              sessionId: response.tokens.session_id,
              isLoading: false
            });
            
            return { isFirstUser: true, autoLogin: true, user: response.user };
          } else {
            // 普通注册
            set({ isLoading: false });
            return { isFirstUser: false, autoLogin: false };
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || error.message || '注册失败');
        }
      },

      // 登出
      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.warn('Logout request failed:', error);
        } finally {
          // 无论请求是否成功，都要清理本地状态
          authService.clearStoredTokens();
          authService.setAuthToken('');
          set({
            user: null,
            isAuthenticated: false,
            permissions: [],
            sessionId: null,
            isLoading: false
          });
        }
      },

      // 登出所有设备
      logoutAll: async () => {
        set({ isLoading: true });
        try {
          await authService.logoutAll();
          authService.clearStoredTokens();
          authService.setAuthToken('');
          set({
            user: null,
            isAuthenticated: false,
            permissions: [],
            sessionId: null,
            isLoading: false
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || error.message || '登出失败');
        }
      },

      // 刷新令牌
      refreshToken: async () => {
        try {
          const success = await authService.autoRefreshToken();
          if (!success) {
            get().clear();
          }
          return success;
        } catch (error) {
          get().clear();
          return false;
        }
      },

      // 获取当前用户信息
      getCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({ 
            user, 
            permissions: user.permissions || [],
            isLoading: false 
          });
        } catch (error: any) {
          set({ isLoading: false });
          // 如果获取用户信息失败，可能是令牌过期
          if (error.response?.status === 401) {
            get().clear();
          }
          throw new Error(error.response?.data?.message || error.message || '获取用户信息失败');
        }
      },

      // 更新用户资料
      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true });
        try {
          const updatedUser = await authService.updateCurrentUser(data);
          authService.storeUser(updatedUser);
          set({ 
            user: updatedUser, 
            isLoading: false 
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || error.message || '更新资料失败');
        }
      },

      // 修改密码
      changePassword: async (data: ChangePasswordRequest) => {
        set({ isLoading: true });
        try {
          await authService.changePassword(data);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || error.message || '修改密码失败');
        }
      },

      // 获取会话列表
      getSessions: async () => {
        try {
          return await authService.getUserSessions();
        } catch (error: any) {
          throw new Error(error.response?.data?.message || error.message || '获取会话列表失败');
        }
      },

      // 撤销会话
      revokeSession: async (sessionId: string) => {
        try {
          await authService.revokeSession(sessionId);
        } catch (error: any) {
          throw new Error(error.response?.data?.message || error.message || '撤销会话失败');
        }
      },

      // 权限检查
      hasPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      hasAnyPermission: (permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.some(permission => userPermissions.includes(permission));
      },

      hasAllPermissions: (permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.every(permission => userPermissions.includes(permission));
      },

      // 初始化认证状态
      initialize: async () => {
        const { accessToken, refreshToken } = authService.getStoredTokens();
        const storedUser = authService.getStoredUser();

        if (accessToken && storedUser) {
          authService.setAuthToken(accessToken);
          set({
            user: storedUser,
            isAuthenticated: true,
            permissions: storedUser.permissions || []
          });

          try {
            // 尝试获取最新的用户信息
            await get().getCurrentUser();
          } catch (error) {
            console.warn('Failed to refresh user info on initialize:', error);
            // 如果失败，尝试刷新令牌
            const refreshSuccess = await get().refreshToken();
            if (refreshSuccess) {
              try {
                await get().getCurrentUser();
              } catch (refreshError) {
                console.error('Failed to get user info after token refresh:', refreshError);
                get().clear();
              }
            }
          }
        } else if (refreshToken) {
          // 只有refresh token，尝试获取新的access token
          const refreshSuccess = await get().refreshToken();
          if (refreshSuccess) {
            try {
              await get().getCurrentUser();
            } catch (error) {
              console.error('Failed to get user info after token refresh:', error);
              get().clear();
            }
          }
        }
      },

      // 清理状态
      clear: () => {
        authService.clearStoredTokens();
        authService.setAuthToken('');
        set({
          user: null,
          isAuthenticated: false,
          permissions: [],
          sessionId: null,
          isLoading: false
        });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化部分状态，敏感信息在authService中管理
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        permissions: state.permissions,
        sessionId: state.sessionId
      }),
    }
  )
);

// 自动刷新令牌的定时器
let tokenRefreshTimer: NodeJS.Timeout | null = null;

// 设置令牌自动刷新
export const setupTokenRefresh = () => {
  // 清除之前的定时器
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
  }

  // 每5分钟检查一次令牌状态
  tokenRefreshTimer = setInterval(async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      await useAuthStore.getState().refreshToken();
    }
  }, 5 * 60 * 1000); // 5分钟
};

// 清理定时器
export const clearTokenRefresh = () => {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
};