// src/context/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from '@/lib/axios';
import { SessionUser } from '@/types';

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  async function restoreSession() {
    try {
      const refreshRes = await api.post('/auth/refresh');
      setAccessToken(refreshRes.data.data.accessToken);

      const sessionRes = await api.get('/auth/session');
      setUser(sessionRes.data.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    restoreSession();

    function handleSessionExpired() {
      setUser(null);
      router.push('/login');
    }
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    const sessionRes = await api.get('/auth/session');
    setUser(sessionRes.data.data);
    router.push('/dashboard');
  }

  async function logout() {
    await api.post('/auth/logout'); // revokes refresh token server-side
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  }

  function hasPermission(permission: string) {
    return user?.permissions.includes(permission) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}