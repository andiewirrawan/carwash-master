'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, isDayClosedForCashier } from '@/lib/db';
import { CategoryNav, CategoryItem } from '@/components/layout/CategoryNav';
import { Car, Clock, Banknote, History, CheckCircle2, ShieldAlert } from 'lucide-react';
import { MobilMasukForm } from '@/components/transactions/MobilMasukForm';
import { SedangDikerjakanView } from '@/components/transactions/SedangDikerjakanView';
import { PembayaranView } from '@/components/transactions/PembayaranView';
import { RiwayatHariIniView } from '@/components/transactions/RiwayatHariIniView';
import { TutupHariView } from '@/components/transactions/TutupHariView';

export type WorkflowStep = 'mobil-masuk' | 'sedang-dikerjakan' | 'pembayaran' | 'riwayat-hari-ini' | 'tutup-hari';

function TransactionsWorkflowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, hasAccess } = useAuth();

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
    
    // Update URL without refresh
    const url = new URL(window.location.href);
    url.searchParams.set('step', step);
    if (targetTrxId) url.searchParams.set('trx', String(targetTrxId));
    else url.searchParams.delete('trx');
    window.history.pushState({}, '', url.toString());
  };

  const categories: CategoryItem[] = [
    { id: 'mobil-masuk', label: 'Mobil Masuk', icon: Car, onClick: () => handleStepChange('mobil-masuk') },
    { id: 'sedang-dikerjakan', label: 'Sedang Dikerjakan', icon: Clock, onClick: () => handleStepChange('sedang-dikerjakan'), badge: countProses > 0 ? countProses : undefined, badgeColor: 'bg-amber-100 text-amber-700' },
    { id: 'pembayaran', label: 'Pembayaran', icon: Banknote, onClick: () => handleStepChange('pembayaran'), badge: countPembayaran > 0 ? countPembayaran : undefined, badgeColor: 'bg-blue-100 text-blue-700' },
    { id: 'riwayat-hari-ini', label: 'Riwayat Hari Ini', icon: History, onClick: () => handleStepChange('riwayat-hari-ini') },
    { id: 'tutup-hari', label: 'Tutup Hari', icon: CheckCircle2, onClick: () => handleStepChange('tutup-hari'), badge: isClosedToday ? 'Selesai' : 'Buka', badgeColor: isClosedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500' },
  ];

  if (hasAccess('owner')) {
    categories.push({ id: 'void-transaksi', label: 'Void Transaksi', icon: ShieldAlert, onClick: () => handleStepChange('riwayat-hari-ini') }); // Void is integrated in Riwayat but filterable or special view
  }

  return (
    <div className="flex flex-col sm:flex-row gap-8">
      {/* Lapis 2: Vertical Category Navigation */}
      <CategoryNav title="Transaksi Kasir" items={categories} activeId={activeStep} />

      {/* Content Area */}
      <div className="flex-1 min-w-0">
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
