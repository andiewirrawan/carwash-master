'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error && error.message) {
      console.error('App error:', error.message);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-white">
      <h2 className="text-2xl font-bold text-red-500">Terjadi Kesalahan Sistem</h2>
      <p className="mt-2 text-sm text-slate-400">
        {error?.message || 'Silakan coba muat ulang halaman ini.'}
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  );
}
