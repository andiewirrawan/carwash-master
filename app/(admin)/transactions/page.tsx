'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, isDayClosedForCashier } from '@/lib/db';
import { WorkflowNav, WorkflowStep } from '@/components/transactions/WorkflowNav';
import { MobilMasukForm } from '@/components/transactions/MobilMasukForm';
import { SedangDikerjakanView } from '@/components/transactions/SedangDikerjakanView';
import { PembayaranView } from '@/components/transactions/PembayaranView';
import { RiwayatHariIniView } from '@/components/transactions/RiwayatHariIniView';
import { TutupHariView } from '@/components/transactions/TutupHariView';

function TransactionsWorkflowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const initialStep = (searchParams.get('step') as WorkflowStep) || 'mobil-masuk';
  const initialTrxId = searchParams.get('trx') ? Number(searchParams.get('trx')) : undefined;

  const [activeStep, setActiveStep] = useState<WorkflowStep>(initialStep);
  const [highlightTrxId, setHighlightTrxId] = useState<number | undefined>(initialTrxId);

  // Badge counts
  const [countProses, setCountProses] = useState<number>(0);
  const [countPembayaran, setCountPembayaran] = useState<number>(0);
  const [isClosedToday, setIsClosedToday] = useState<boolean>(false);

  const today = new Date().toISOString().split('T')[0];

  const refreshBadges = useCallback(async () => {
    try {
      const activeTrx = await getTransactions({ status: 'aktif', status_pengerjaan: 'proses' });
      setCountProses(activeTrx.length);
      setCountPembayaran(activeTrx.length);

      if (user?.id) {
        const closed = await isDayClosedForCashier(today, user.id);
        setIsClosedToday(closed);
      }
    } catch (err) {
      console.error('Failed refreshing transaction badges:', err);
    }
  }, [user, today]);

  useEffect(() => {
    refreshBadges();
    const interval = setInterval(refreshBadges, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [refreshBadges]);

  // Handle step change
  const handleStepChange = (step: WorkflowStep, targetTrxId?: number) => {
    setActiveStep(step);
    setHighlightTrxId(targetTrxId);
    refreshBadges();
  };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation Bar */}
      <WorkflowNav
        activeStep={activeStep}
        onChangeStep={(step) => handleStepChange(step)}
        countProses={countProses}
        countPembayaran={countPembayaran}
        isClosedToday={isClosedToday}
      />

      {/* Step 1: Mobil Masuk */}
      {activeStep === 'mobil-masuk' && (
        <MobilMasukForm
          onSuccessNavigate={(nextStep, createdTrxId) => {
            handleStepChange(nextStep, createdTrxId);
          }}
        />
      )}

      {/* Step 2: Sedang Dikerjakan */}
      {activeStep === 'sedang-dikerjakan' && (
        <SedangDikerjakanView
          highlightTrxId={highlightTrxId}
          onNavigateStep={(nextStep, targetTrxId) => {
            handleStepChange(nextStep, targetTrxId);
          }}
        />
      )}

      {/* Step 3: Pembayaran */}
      {activeStep === 'pembayaran' && (
        <PembayaranView
          preSelectedTrxId={highlightTrxId}
          onNavigateStep={(nextStep) => {
            handleStepChange(nextStep);
          }}
        />
      )}

      {/* Step 4: Riwayat Hari Ini */}
      {activeStep === 'riwayat-hari-ini' && <RiwayatHariIniView />}

      {/* Step 5: Tutup Hari */}
      {activeStep === 'tutup-hari' && <TutupHariView />}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500 font-semibold text-xs">
            Memuat modul transaksi Carwash Master...
          </div>
        }
      >
        <TransactionsWorkflowContent />
      </Suspense>
    </AdminLayout>
  );
}
