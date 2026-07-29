// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until AuthContext finishes checking the session (via /auth/refresh + /auth/me)
    if (isLoading) return;

    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Brief loading state while the redirect decision is being made
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  );
}