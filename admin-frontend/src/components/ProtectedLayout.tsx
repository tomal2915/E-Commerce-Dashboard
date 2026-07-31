// src/components/ProtectedLayout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingState } from '@/components/shared/DataStates';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once we're SURE there's no session (not mid-check)
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // While AuthContext is still restoring the session, show a loading
  // state instead of flashing "undefined" or a blank sidebar.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <LoadingState message ="Loading your session..." />
      </div>
    );
  }

  // No user and redirect hasn't kicked in yet — render nothing rather
  // than a half-populated protected page.
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50 overflow-y-auto">{children}</main>
    </div>
  );
}