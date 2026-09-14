'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { WorkflowNav } from '@/components/transactions/WorkflowNav';
import { TutupHariView } from '@/components/transactions/TutupHariView';

export default function TutupHariPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <WorkflowNav
          activeStep="tutup-hari"
          onChangeStep={(step) => {
            if (step === 'tutup-hari') return;
            if (step === 'mobil-masuk') router.push('/transactions/mobil-masuk');
            else if (step === 'sedang-dikerjakan') router.push('/transactions/sedang-dikerjakan');
            else if (step === 'pembayaran') router.push('/transactions/pembayaran');
            else router.push(`/transactions?step=${step}`);
          }}
        />
        <TutupHariView />
      </div>
    </AdminLayout>
  );
}
