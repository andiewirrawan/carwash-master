'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KomisiManualRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports?category=komisi_manual');
  }, [router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 text-slate-500 text-sm">
      Mengalihkan ke Laporan &amp; Keuangan &gt; Komisi Manual...
    </div>
  );
}
