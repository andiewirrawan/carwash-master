'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { WorkflowNav } from '@/components/transactions/WorkflowNav';
import { MobilMasukForm } from '@/components/transactions/MobilMasukForm';

export default function MobilMasukPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <WorkflowNav
          activeStep="mobil-masuk"
          onChangeStep={(step) => {
            if (step === 'mobil-masuk') return;
            if (step === 'sedang-dikerjakan') router.push('/transactions/sedang-dikerjakan');
            else if (step === 'pembayaran') router.push('/transactions/pembayaran');
            else if (step === 'tutup-hari') router.push('/transactions/tutup-hari');
            else router.push(`/transactions?step=${step}`);
          }}
        />
        <MobilMasukForm
          onSuccessNavigate={(step, trxId) => {
            if (step === 'sedang-dikerjakan') {
              router.push(`/transactions/sedang-dikerjakan${trxId ? `?trx=${trxId}` : ''}`);
            }
          }}
        />
      </div>
    </AdminLayout>
  );
}
