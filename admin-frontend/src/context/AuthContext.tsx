// src/context/AuthContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true while we check session on load
  const router = useRouter();

  // ---- On every page reload: try to restore the session ----
  useEffect(() => {
    async function restoreSession() {
      try {
        // Access token is gone (in-memory only), so ask for a fresh one
        // using the httpOnly refresh_token cookie the browser sends automatically.
        const refreshRes = await api.post('/auth/refresh');
        setAccessToken(refreshRes.data.data.accessToken);

        // Now that we have a valid access token, fetch the user's profile
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.data);
      } catch {
        // No valid refresh token either — user is simply logged out
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    // ---- Listen for session-expired events fired by the axios interceptor ----
    function handleSessionExpired() {
      setUser(null);
      router.push('/login');
    }
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
  }, [router]);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);

    const meRes = await api.get('/auth/me');
    setUser(meRes.data.data);
    router.push('/dashboard');
  }

  async function logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  }

  // Quick helper so components can do: hasPermission('product:create')
  function hasPermission(permission: string): boolean {
    return user?.permissions.includes(permission) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components just do: const { user, hasPermission } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}