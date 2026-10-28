import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/api/endpoints';
import { refreshAccessToken, tokenStore } from '@/api/client';
import type { AuthResponse, Role, User } from '@/api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  hasRole: (role: Role) => boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (body: Parameters<typeof authApi.register>[0]) => Promise<User>;
  completeOAuth: (access: string, refresh: string) => Promise<User>;
  setUser: (u: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from the persisted refresh token.
    (async () => {
      if (tokenStore.refresh && (await refreshAccessToken())) {
        try {
          setUser(await authApi.me());
        } catch {
          tokenStore.clear();
        }
      }
      setLoading(false);
    })();
    return tokenStore.onLogout(() => setUser(null));
  }, []);

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      hasRole: (role) => !!user?.roles.includes(role),
      login: async (email, password) => accept(await authApi.login(email, password)),
      register: async (body) => accept(await authApi.register(body)),
      completeOAuth: async (access, refresh) => {
        tokenStore.set({ accessToken: access, refreshToken: refresh });
        const me = await authApi.me();
        setUser(me);
        return me;
      },
      setUser,
      logout: () => tokenStore.clear(),
    }),
    [user, loading, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
