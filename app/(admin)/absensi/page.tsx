'use client';

import React, { useState } from 'react';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { InputAbsensiContent } from './components/InputAbsensiContent';
import { HistoryAbsensiContent } from './components/HistoryAbsensiContent';
import { ClipboardCheck, History } from 'lucide-react';

const CATEGORIES = [
  { id: 'input', label: 'Input Absensi', icon: ClipboardCheck },
  { id: 'history', label: 'History Absensi', icon: History },
];

export default function AbsensiPage() {
  const [activeCategory, setActiveCategory] = useState('input');

  const renderContent = () => {
    switch (activeCategory) {
      case 'input':
        return <InputAbsensiContent />;
      case 'history':
        return <HistoryAbsensiContent />;
      default:
        return <InputAbsensiContent />;
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
            title="Absensi Staff"
          />
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Presensi Karyawan
            </h1>
            <p className="text-sm text-slate-500">
              Kelola daftar hadir harian dan pantau kedisiplinan staff cuci.
            </p>
          </div>
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
