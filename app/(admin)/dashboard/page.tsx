'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { getPriceList, getVehicleCategories, getStaffList, getUsersList, getStaffMultipliers } from '@/lib/db';
import { formatNominal } from '@/lib/format';
import Link from 'next/link';
import {
  Tag,
  Car,
  Users,
  Percent,
  ShieldCheck,
  HardDrive,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Database,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isSistemOwner, isOwner, isSpv } = useAuth();

  const [stats, setStats] = useState({
    totalPrices: 0,
    totalVehicles: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalUsers: 0,
    totalMultipliers: 0,
    avgPrice: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [prices, vehicles, staff, users, multipliers] = await Promise.all([
          getPriceList(),
          getVehicleCategories(),
          getStaffList(),
          getUsersList(),
          getStaffMultipliers(),
        ]);

        const activeStaffCount = staff.filter((s) => s.aktif).length;
        const totalPriceSum = prices.reduce((acc, p) => acc + Number(p.harga), 0);
        const avg = prices.length > 0 ? totalPriceSum / prices.length : 0;

        setStats({
          totalPrices: prices.length,
          totalVehicles: vehicles.length,
          totalStaff: staff.length,
          activeStaff: activeStaffCount,
          totalUsers: users.length,
          totalMultipliers: multipliers.length,
          avgPrice: Math.round(avg),
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-gradient-to-r from-[#0A2A5E] to-[#1E40AF] p-6 text-white shadow-md">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/60 px-3 py-1 text-xs font-semibold text-amber-300 mb-2 border border-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Selamat Datang, {user?.nama}
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Sistem Kasir BSA Car Wash — Tahap 1 Master Data
            </h1>
            <p className="mt-1 text-xs text-blue-200 sm:text-sm">
              Kelola Daftar Harga, Kategori Kendaraan, Data Staff, Komisi Multiplier, & Hak Akses User.
            </p>
          </div>
          <div className="mt-3 sm:mt-0">
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-xs text-xs space-y-1 text-blue-100 border border-white/10">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-300" />
                Format Tanggal: dd/mm/yyyy
              </p>
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-300" />
                Nominal: tanpa &quot;Rp&quot; (200.000)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Price List Stat */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daftar Harga Paket
              </span>
              <div className="rounded-lg bg-blue-50 p-2.5 text-[#0A2A5E]">
                <Tag className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : stats.totalPrices} <span className="text-xs font-normal text-slate-500">paket</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Rata-rata harga: <span className="font-semibold text-slate-700">{formatNominal(stats.avgPrice)}</span>
              </p>
            </div>
            <Link
              href="/price-list"
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
            >
              Kelola Price List <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Vehicles Stat */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kategori Kendaraan
              </span>
              <div className="rounded-lg bg-amber-50 p-2.5 text-[#F97316]">
                <Car className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : stats.totalVehicles} <span className="text-xs font-normal text-slate-500">tipe</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Mobil & Motor terdaftar</p>
            </div>
            <Link
              href="/vehicles"
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
            >
              Kelola Kendaraan <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Staff Stat */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Data Staff / Petugas
              </span>
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : stats.totalStaff} <span className="text-xs font-normal text-slate-500">petugas</span>
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                {stats.activeStaff} staff aktif bertugas
              </p>
            </div>
            <Link
              href="/staff"
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
            >
              Kelola Data Staff <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Multipliers Stat */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Komisi Multiplier
              </span>
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : stats.totalMultipliers} <span className="text-xs font-normal text-slate-500">riwayat</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Effective Date Indexing</p>
            </div>
            <Link
              href="/staff-multipliers"
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
            >
              Riwayat Multiplier <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Action Shortcuts & Role Info */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Quick Access Cards */}
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-bold text-[#0A2A5E]">Menu Aksi Cepat Master Data</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/price-list"
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#F97316] hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  <div className="inline-flex rounded-lg bg-blue-50 p-3 text-[#0A2A5E]">
                    <Tag className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#F97316] transition-colors">
                    CRUD Price List
                  </h3>
                  <p className="text-xs text-slate-600">
                    Atur paket cuci, fasilitas, tipe kendaraan, harga, dan alokasi komisi washer & checker.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#F97316]">
                  <span>Buka Price List</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/staff"
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#F97316] hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  <div className="inline-flex rounded-lg bg-emerald-50 p-3 text-emerald-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#F97316] transition-colors">
                    CRUD Data Staff & Role
                  </h3>
                  <p className="text-xs text-slate-600">
                    Kelola nama petugas washer, checker, leader, dan status keaktifan kerja.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#F97316]">
                  <span>Buka Data Staff</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/staff-multipliers"
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#F97316] hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  <div className="inline-flex rounded-lg bg-indigo-50 p-3 text-indigo-600">
                    <Percent className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#F97316] transition-colors">
                    Riwayat Multiplier Komisi
                  </h3>
                  <p className="text-xs text-slate-600">
                    Tambah persen komisi tambahan per tanggal efektif tanpa menghapus riwayat lama.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#F97316]">
                  <span>Lihat Riwayat</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/vehicles"
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#F97316] hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  <div className="inline-flex rounded-lg bg-amber-50 p-3 text-[#F97316]">
                    <Car className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#F97316] transition-colors">
                    Kategori Kendaraan
                  </h3>
                  <p className="text-xs text-slate-600">
                    Kelola merk, model, tipe (Small, Medium, Large) dan kode kategori kendaraan.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#F97316]">
                  <span>Buka Kategori</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>

          {/* Right Col: User Privilege & System Backup Status */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0A2A5E]">Hak Akses & Backup Status</h2>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-[#0A2A5E]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Role Anda: {user?.role}</h3>
                  <p className="text-xs text-slate-500">Nama: {user?.nama}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <p className="font-semibold text-[#0A2A5E] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Wewenang Role Aktif:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  {isSistemOwner && (
                    <li className="font-semibold text-purple-700">
                      sistem_owner: Full akses tanpa batas & Kelola User.
                    </li>
                  )}
                  {isOwner && <li>owner: Laporan lengkap, insentif, void, komisi manual.</li>}
                  {isSpv && <li>spv: Approve/edit transaksi & laporan keuangan.</li>}
                  <li>admin: Input transaksi harian & CRUD Master Data.</li>
                </ul>
              </div>

              {isSistemOwner && (
                <Link
                  href="/users"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A2A5E] py-2.5 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Kelola User (Sistem Owner)
                </Link>
              )}
            </div>

            {/* Backup Box */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <HardDrive className="h-5 w-5 text-[#F97316]" />
                Supabase & Backup Storage
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supabase Point-in-Time Recovery (PITR) & fitur Export Mingguan 2 Lapis (CSV / JSON dump).
              </p>
              <Link
                href="/backup"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline"
              >
                Pengaturan Backup & Export <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
