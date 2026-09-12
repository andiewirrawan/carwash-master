'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F97316] border-t-transparent" />
        <p className="text-sm font-medium text-slate-300">Mengarahkan ke Sistem Kasir Carwash Master...</p>
      </div>
    </div>
  );
}
