'use client';

import React, { useState } from 'react';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LaporanHarianContent } from './components/LaporanHarianContent';
import { LaporanBulananContent } from './components/LaporanBulananContent';
import { InsentifWasherReportContent } from './components/InsentifWasherReportContent';
import { RekapAbsensiContent } from './components/RekapAbsensiContent';
import { RekapTutupHariContent } from './components/RekapTutupHariContent';
import { PiutangContent } from './components/PiutangContent';
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  ClipboardList, 
  Lock,
  Wallet 
} from 'lucide-react';

const CATEGORIES = [
  { id: 'harian', label: 'Laporan Harian', icon: BarChart3 },
  { id: 'bulanan', label: 'Laporan Bulanan', icon: Calendar },
  { id: 'insentif', label: 'Insentif Washer', icon: DollarSign },
  { id: 'absensi', label: 'Rekap Absensi', icon: ClipboardList },
  { id: 'closing', label: 'Rekap Tutup Hari', icon: Lock },
  { id: 'piutang', label: 'Daftar Piutang', icon: Wallet },
];

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState('harian');

  const renderContent = () => {
    switch (activeCategory) {
      case 'harian':
        return <LaporanHarianContent />;
      case 'bulanan':
        return <LaporanBulananContent />;
      case 'insentif':
        return <InsentifWasherReportContent />;
      case 'absensi':
        return <RekapAbsensiContent />;
      case 'closing':
        return <RekapTutupHariContent />;
      case 'piutang':
        return <PiutangContent />;
      default:
        return <LaporanHarianContent />;
    }
  };

  return (
    <AdminLayout>
      <div className="flex h-full flex-col gap-6 lg:flex-row">
        {/* Left: Category Navigation */}
        <div className="w-full lg:w-64">
          <CategoryNav
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            title="Laporan & Keuangan"
          />
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Analitik Bisnis
            </h1>
            <p className="text-sm text-slate-500">
              Pantau performa harian, komisi staff, dan rekapitulasi keuangan secara real-time.
            </p>
          </div>
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
