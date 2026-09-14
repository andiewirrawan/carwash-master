'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  FileSpreadsheet,
  Award,
  Sparkles,
  Banknote,
  ArrowRight,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function ReportsHubPage() {
  const { user } = useAuth();

  const reportItems = [
    {
      title: 'Laporan Bulanan & Omzet',
      description: 'Rekap omzet, transaksi tunai vs QRIS vs piutang, dan tren pendapatan bulanan',
      href: '/laporan-bulanan',
      icon: FileSpreadsheet,
      badge: 'Utama',
      color: 'bg-blue-600',
    },
    {
      title: 'Insentif Mingguan Staff',
      description: 'Perhitungan insentif berbasis jumlah unit cuci, kehadiran, dan multiplier staff',
      href: '/insentif-mingguan',
      icon: Banknote,
      badge: 'Mingguan',
      color: 'bg-emerald-600',
    },
    {
      title: 'Komisi Washer',
      description: 'Rincian akumulasi komisi pengerjaan pencucian kendaraan per staff washer',
      href: '/komisi-washer',
      icon: Award,
      badge: 'Operasional',
      color: 'bg-indigo-600',
    },
    {
      title: 'Komisi Manual',
      description: 'Pencatatan bonus manual, insentif lembur, atau penyesuaian komisi khusus',
      href: '/komisi-manual',
      icon: Sparkles,
      badge: 'Custom',
      color: 'bg-amber-600',
    },
  ];

  return (
    <AdminLayout>
      <div id="reports-hub-page" className="space-y-6">
        <div>
          <h1 id="reports-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
            Laporan &amp; Analisis Keuangan
          </h1>
          <p className="text-sm text-slate-500">
            Pusat laporan performa kasir, omzet operasional, dan perhitungan insentif staff Carwash Master
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {reportItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-blue-500 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {item.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Laporan</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
