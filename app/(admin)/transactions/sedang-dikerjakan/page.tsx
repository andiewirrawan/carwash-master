'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { WorkflowNav } from '@/components/transactions/WorkflowNav';
import { SedangDikerjakanView } from '@/components/transactions/SedangDikerjakanView';

function SedangDikerjakanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightTrxId = searchParams.get('trx') ? Number(searchParams.get('trx')) : undefined;

  return (
    <div className="space-y-6">
      <WorkflowNav
        activeStep="sedang-dikerjakan"
        onChangeStep={(step) => {
          if (step === 'sedang-dikerjakan') return;
          if (step === 'mobil-masuk') router.push('/transactions/mobil-masuk');
          else if (step === 'pembayaran') router.push('/transactions/pembayaran');
          else if (step === 'tutup-hari') router.push('/transactions/tutup-hari');
          else router.push(`/transactions?step=${step}`);
        }}
      />
      <SedangDikerjakanView
        highlightTrxId={highlightTrxId}
        onNavigateStep={(step, trxId) => {
          if (step === 'pembayaran') {
            router.push(`/transactions/pembayaran${trxId ? `?trx=${trxId}` : ''}`);
          } else if (step === 'mobil-masuk') {
            router.push('/transactions/mobil-masuk');
          }
        }}
      />
    </div>
  );
}

export default function SedangDikerjakanPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold text-xs">Memuat antrean pengerjaan...</div>}>
        <SedangDikerjakanContent />
      </Suspense>
    </AdminLayout>
  );
}
