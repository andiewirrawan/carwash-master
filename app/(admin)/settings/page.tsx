'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { BackupContent } from './components/BackupContent';
import { ResetDataContent } from './components/ResetDataContent';
import { HardDrive, ShieldAlert, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, isSistemOwner } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') || 'backup';

  const [activeCategory, setActiveCategory] = useState<string>(initialTab);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      setActiveCategory(tabParam);
    }
  }, [searchParams]);

  // Categories list - 'Reset Data' is shown only to Sistem Owner
  const categories = [
    { id: 'backup', label: 'Backup & Database', icon: HardDrive },
    ...(isSistemOwner
      ? [{ id: 'reset-data', label: 'Reset Data', icon: ShieldAlert }]
      : []),
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case 'backup':
        return <BackupContent />;
      case 'reset-data':
        return <ResetDataContent />;
      default:
        return <BackupContent />;
    }
  };

  return (
    <AdminLayout>
      <div className="flex h-full flex-col gap-6 lg:flex-row">
        {/* Left Category Navigation */}
        <div className="w-full lg:w-64 shrink-0">
          <CategoryNav
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            title="Pengaturan"
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
