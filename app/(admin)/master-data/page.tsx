'use client';

import React, { useState } from 'react';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { PriceListContent } from './components/PriceListContent';
import { VehiclesContent } from './components/VehiclesContent';
import { StaffContent } from './components/StaffContent';
import { StaffMultipliersContent } from './components/StaffMultipliersContent';
import { UsersContent } from './components/UsersContent';
import { ResetDataContent } from '../settings/components/ResetDataContent';
import { Tag, Car, Users, Percent, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function MasterDataPage() {
  const { isSistemOwner } = useAuth();
  const [activeCategory, setActiveCategory] = useState('price-list');

  const categories = [
    { id: 'price-list', label: 'Harga & Komisi', icon: Tag },
    { id: 'vehicles', label: 'Jenis Kendaraan', icon: Car },
    { id: 'staff', label: 'Data Staff', icon: Users },
    { id: 'multipliers', label: 'Riwayat Multiplier', icon: Percent },
    { id: 'users', label: 'Akses Login (Wiro)', icon: ShieldCheck },
    ...(isSistemOwner
      ? [{ id: 'reset-data', label: 'Reset Data', icon: ShieldAlert }]
      : []),
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case 'price-list':
        return <PriceListContent />;
      case 'vehicles':
        return <VehiclesContent />;
      case 'staff':
        return <StaffContent />;
      case 'multipliers':
        return <StaffMultipliersContent />;
      case 'users':
        return <UsersContent />;
      case 'reset-data':
        return <ResetDataContent />;
      default:
        return <PriceListContent />;
    }
  };

  return (
    <AdminLayout>
      <div className="flex h-full flex-col gap-6 lg:flex-row">
        {/* Left: Category Navigation */}
        <div className="w-full lg:w-64 shrink-0">
          <CategoryNav
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            title="Master Data"
          />
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}

