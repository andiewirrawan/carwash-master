'use client';

import React, { useState } from 'react';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PriceListContent } from './components/PriceListContent';
import { VehiclesContent } from './components/VehiclesContent';
import { StaffContent } from './components/StaffContent';
import { StaffMultipliersContent } from './components/StaffMultipliersContent';
import { UsersContent } from './components/UsersContent';
import { Tag, Car, Users, Percent, ShieldCheck } from 'lucide-react';

const CATEGORIES = [
  { id: 'price-list', label: 'Harga & Komisi', icon: Tag },
  { id: 'vehicles', label: 'Jenis Kendaraan', icon: Car },
  { id: 'staff', label: 'Data Staff', icon: Users },
  { id: 'multipliers', label: 'Riwayat Multiplier', icon: Percent },
  { id: 'users', label: 'Akses Login (Wiro)', icon: ShieldCheck },
];

export default function MasterDataPage() {
  const [activeCategory, setActiveCategory] = useState('price-list');

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
      default:
        return <PriceListContent />;
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
