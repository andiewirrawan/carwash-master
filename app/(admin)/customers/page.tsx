'use client';

import React, { useState } from 'react';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ListCustomerContent } from './components/ListCustomerContent';
import { GantiNopolContent } from './components/GantiNopolContent';
import { Users, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  { id: 'list', label: 'Daftar Customer', icon: Users },
  { id: 'ganti-nopol', label: 'Ganti Nopol', icon: RefreshCw },
];

export default function CustomersPage() {
  const [activeCategory, setActiveCategory] = useState('list');

  const renderContent = () => {
    switch (activeCategory) {
      case 'list':
        return <ListCustomerContent />;
      case 'ganti-nopol':
        return <GantiNopolContent />;
      default:
        return <ListCustomerContent />;
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
            title="Data Customer"
          />
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Manajemen Pelanggan
            </h1>
            <p className="text-sm text-slate-500">
              Kelola database customer, riwayat kunjungan aktif, dan penyesuaian plat nomor.
            </p>
          </div>
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
