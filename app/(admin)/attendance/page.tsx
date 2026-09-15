'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AttendanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/absensi?category=absensi_harian');
  }, [router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 text-slate-500 text-sm">
      Mengalihkan ke Absensi Staff &gt; Absensi Harian...
    </div>
  );
}
