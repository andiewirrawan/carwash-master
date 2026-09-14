'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Database,
  Tag,
  Car,
  Users,
  Percent,
  ArrowRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function MasterDataHubPage() {
  const { user } = useAuth();

  const masterItems = [
    {
      title: 'Daftar Harga & Komisi Paket',
      description: 'Atur paket pencucian mobil dan motor, harga standar, serta nominal komisi peran kerja',
      href: '/price-list',
      icon: Tag,
      color: 'bg-emerald-600',
    },
    {
      title: 'Kategori Kendaraan',
      description: 'Kelola kategori tipe kendaraan (Small, Medium, Large, Luxury) dan merk/model',
      href: '/vehicles',
      icon: Car,
      color: 'bg-blue-600',
    },
    {
      title: 'Data Staff & Karyawan',
      description: 'Daftar staf aktif, peran (washer, checker, leader), status, dan pengaturan multiplier',
      href: '/staff',
      icon: Users,
      color: 'bg-indigo-600',
    },
    {
      title: 'Riwayat Multiplier Komisi',
      description: 'Audit log riwayat penambahan multiplier komisi staff dari waktu ke waktu',
      href: '/staff-multipliers',
      icon: Percent,
      color: 'bg-amber-600',
    },
  ];

  return (
    <AdminLayout>
      <div id="master-data-hub-page" className="space-y-6">
        <div>
          <h1 id="master-data-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
            Master Data Operasional
          </h1>
          <p className="text-sm text-slate-500">
            Konfigurasi tarif, kendaraan, data staff, dan aturan komisi Carwash Master
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {masterItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-blue-500 hover:shadow-md"
            >
              <div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Kelola Data</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
