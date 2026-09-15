'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InsentifMingguanRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports?category=insentif_washer&tab=mingguan');
  }, [router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 text-slate-500 text-sm">
      Mengalihkan ke Laporan &amp; Keuangan &gt; Insentif Washer...
    </div>
  );
}
