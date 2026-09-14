'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { WorkflowNav } from '@/components/transactions/WorkflowNav';
import { PembayaranView } from '@/components/transactions/PembayaranView';

function PembayaranContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedTrxId = searchParams.get('trx') ? Number(searchParams.get('trx')) : undefined;

  return (
    <div className="space-y-6">
      <WorkflowNav
        activeStep="pembayaran"
        onChangeStep={(step) => {
          if (step === 'pembayaran') return;
          if (step === 'mobil-masuk') router.push('/transactions/mobil-masuk');
          else if (step === 'sedang-dikerjakan') router.push('/transactions/sedang-dikerjakan');
          else if (step === 'tutup-hari') router.push('/transactions/tutup-hari');
          else router.push(`/transactions?step=${step}`);
        }}
      />
      <PembayaranView
        preSelectedTrxId={preSelectedTrxId}
        onNavigateStep={(step) => {
          if (step === 'riwayat-hari-ini') {
            router.push('/transactions?step=riwayat-hari-ini');
          } else if (step === 'sedang-dikerjakan') {
            router.push('/transactions/sedang-dikerjakan');
          }
        }}
      />
    </div>
  );
}

export default function PembayaranPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold text-xs">Memuat kasir pembayaran...</div>}>
        <PembayaranContent />
      </Suspense>
    </AdminLayout>
  );
}
