'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getLaporanHarian,
  getLaporanHarianRange,
  getLaporanBulanan,
  getTransactions,
  getStaffList,
  getKomisiPerStaff,
} from '@/lib/db';
import { formatNominal, formatDate, formatChartDate, formatMonthYear } from '@/lib/format';
import { LaporanHarian, LaporanBulanan, Transaction, Staff, KomisiPerStaff } from '@/types/database';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Users,
  Award,
  FileSpreadsheet,
  CheckCircle2,
  Car,
} from 'lucide-react';

export default function DashboardOwnerPage() {
  const { user, isOwner, isSpv, isSistemOwner } = useAuth();

  // Role authorization check: only spv, owner, sistem_owner
  const isAuthorized = isSpv || isOwner || isSistemOwner;

  const [loading, setLoading] = useState<boolean>(true);
  const [laporanHarian, setLaporanHarian] = useState<LaporanHarian[]>([]);
  const [laporanBulanan, setLaporanBulanan] = useState<LaporanBulanan[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [, setStaffList] = useState<Staff[]>([]);
  const [topStaffKomisi, setTopStaffKomisi] = useState<KomisiPerStaff[]>([]);

  // Chart view mode: 'omzet' | 'breakdown'
  const [chartMode, setChartMode] = useState<'omzet' | 'breakdown'>('omzet');

  // Load data
  useEffect(() => {
    async function loadDashboardData() {
      if (!isAuthorized) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Calculate 30 days back from today (2026-09-12)
        const today = new Date(2026, 8, 12);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

        const yyyyStart = thirtyDaysAgo.getFullYear();
        const mmStart = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
        const ddStart = String(thirtyDaysAgo.getDate()).padStart(2, '0');
        const startDateStr = `${yyyyStart}-${mmStart}-${ddStart}`;

        const yyyyEnd = today.getFullYear();
        const mmEnd = String(today.getMonth() + 1).padStart(2, '0');
        const ddEnd = String(today.getDate()).padStart(2, '0');
        const endDateStr = `${yyyyEnd}-${mmEnd}-${ddEnd}`;

        const [harian, bulanan, trxs, staff, komisi] = await Promise.all([
          getLaporanHarianRange(startDateStr, endDateStr),
          getLaporanBulanan(2026),
          getTransactions(),
          getStaffList(),
          getKomisiPerStaff({ startDate: startDateStr, endDate: endDateStr }),
        ]);

        setLaporanHarian(harian);
        setLaporanBulanan(bulanan);
        setRecentTransactions(trxs.slice(0, 7));
        setStaffList(staff);
        setTopStaffKomisi(komisi);
      } catch (err) {
        console.error('Error loading owner dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [isAuthorized]);

  // Calculations for Today & Current Month
  const todayStr = '2026-09-12';
  const currentMonthPrefix = '2026-09';

  const todayReport = useMemo(() => {
    return (
      laporanHarian.find((h) => h.tanggal === todayStr) || {
        tanggal: todayStr,
        jumlah_transaksi: 0,
        omzet: 0,
        tunai: 0,
        qris: 0,
        piutang: 0,
      }
    );
  }, [laporanHarian]);

  const monthReport = useMemo(() => {
    // Sum all daily reports belonging to current month
    const thisMonthDays = laporanHarian.filter((h) => h.tanggal.startsWith(currentMonthPrefix));
    if (thisMonthDays.length > 0) {
      return thisMonthDays.reduce(
        (acc, curr) => ({
          jumlah_transaksi: acc.jumlah_transaksi + curr.jumlah_transaksi,
          omzet: acc.omzet + curr.omzet,
          tunai: acc.tunai + curr.tunai,
          qris: acc.qris + curr.qris,
          piutang: acc.piutang + curr.piutang,
        }),
        { jumlah_transaksi: 0, omzet: 0, tunai: 0, qris: 0, piutang: 0 }
      );
    }
    const fromMonthlyView = laporanBulanan.find((b) => b.bulan.startsWith(currentMonthPrefix));
    return {
      jumlah_transaksi: fromMonthlyView?.jumlah_transaksi || 0,
      omzet: fromMonthlyView?.omzet || 0,
      tunai: 0,
      qris: 0,
      piutang: 0,
    };
  }, [laporanHarian, laporanBulanan]);

  // Prepare 30-day chronological chart data
  const chartData = useMemo(() => {
    // Sort ascending for timeline display left to right
    const sorted = [...laporanHarian].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    return sorted.map((item) => ({
      ...item,
      displayDate: formatChartDate(item.tanggal),
      formattedDateFull: formatDate(item.tanggal),
      formattedOmzet: formatNominal(item.omzet),
    }));
  }, [laporanHarian]);

  // Payment Breakdown Percentages for This Month
  const paymentBreakdown = useMemo(() => {
    const total = monthReport.omzet || 1;
    const tunaiVal = monthReport.tunai || 0;
    const qrisVal = monthReport.qris || 0;
    const piutangVal = monthReport.piutang || 0;

    return {
      tunai: {
        nominal: tunaiVal,
        persen: Math.round((tunaiVal / total) * 100),
      },
      qris: {
        nominal: qrisVal,
        persen: Math.round((qrisVal / total) * 100),
      },
      piutang: {
        nominal: piutangVal,
        persen: Math.round((piutangVal / total) * 100),
      },
    };
  }, [monthReport]);

  // Aggregate Komisi per staff for this month
  const staffKomisiSummary = useMemo(() => {
    const map = new Map<number, { id: number; nama: string; role: string; totalKomisi: number }>();
    for (const k of topStaffKomisi) {
      const existing = map.get(k.id) || {
        id: k.id,
        nama: k.nama,
        role: k.role,
        totalKomisi: 0,
      };
      existing.totalKomisi += k.total_komisi;
      map.set(k.id, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalKomisi - a.totalKomisi);
  }, [topStaffKomisi]);

  // Access Denied Screen for Kasir / Non-Owner/SPV
  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Akses Terbatas: Dashboard Owner</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Halaman analitik omzet dan laporan keuangan ini hanya dapat diakses oleh role{' '}
            <span className="font-semibold text-[#0A2A5E]">SPV, Owner, atau Sistem Owner</span>.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A2A5E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-900 transition-colors"
            >
              <Receipt className="h-4 w-4" />
              Menu Transaksi Kasir
            </Link>
            <Link
              href="/price-list"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Car className="h-4 w-4" />
              Master Data Price List
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-[#0A2A5E] via-[#0E3A7E] to-[#1E40AF] p-6 text-white shadow-md">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/70 px-3 py-1 text-xs font-semibold text-amber-300 mb-2 border border-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Dashboard Eksekutif & Owner
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Ikhtisar Keuangan & Performa Carwash BSA
            </h1>
            <p className="mt-1 text-xs text-blue-200 sm:text-sm">
              Monitoring real-time omzet harian, performa bulanan, metode bayar, dan rekap komisi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-white/10 px-3.5 py-2 text-xs backdrop-blur-xs border border-white/15">
              <span className="text-blue-200">Tanggal Operasional:</span>{' '}
              <span className="font-bold text-white">{formatDate(todayStr)}</span>
            </div>
          </div>
        </div>

        {/* 4 Main Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Omzet Hari Ini */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Omzet Hari Ini
              </span>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : formatNominal(todayReport.omzet)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{loading ? '...' : todayReport.jumlah_transaksi} transaksi hari ini</span>
                <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  dd/mm/yyyy
                </span>
              </div>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-full" />
            </div>
          </div>

          {/* Card 2: Omzet Bulan Ini */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Omzet Bulan Ini ({formatMonthYear(todayStr)})
              </span>
              <div className="rounded-xl bg-blue-50 p-2.5 text-[#0A2A5E] border border-blue-100">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : formatNominal(monthReport.omzet)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Total akumulasi bulan berjalan</span>
                <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {monthReport.jumlah_transaksi} unit
                </span>
              </div>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0A2A5E] w-full" />
            </div>
          </div>

          {/* Card 3: Jumlah Transaksi */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Transaksi 30 Hari
              </span>
              <div className="rounded-xl bg-amber-50 p-2.5 text-[#F97316] border border-amber-100">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading
                  ? '...'
                  : laporanHarian.reduce((a, c) => a + c.jumlah_transaksi, 0)}{' '}
                <span className="text-xs font-normal text-slate-500">kendaraan</span>
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Rata-rata / hari:</span>
                <span className="font-semibold text-slate-700">
                  {laporanHarian.length > 0
                    ? Math.round(
                        laporanHarian.reduce((a, c) => a + c.jumlah_transaksi, 0) /
                          laporanHarian.length
                      )
                    : 0}{' '}
                  unit
                </span>
              </div>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#F97316] w-full" />
            </div>
          </div>

          {/* Card 4: Total Komisi Washer Bulan Ini */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Komisi Petugas (30 Hari)
              </span>
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 border border-purple-100">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading
                  ? '...'
                  : formatNominal(topStaffKomisi.reduce((a, c) => a + c.total_komisi, 0))}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Washer & Checker</span>
                <Link
                  href="/komisi-washer"
                  className="font-semibold text-purple-700 hover:underline flex items-center gap-0.5"
                >
                  Detail <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 w-full" />
            </div>
          </div>
        </div>

        {/* 30-Day Omzet Chart Section (recharts) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#0A2A5E]" />
                <h2 className="text-base font-bold text-slate-900">
                  Grafik Omzet Harian 30 Hari Terakhir
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Data historis omzet dari SQL View <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono">laporan_harian</code> (status aktif).
              </p>
            </div>

            {/* Chart toggle buttons */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
              <button
                onClick={() => setChartMode('omzet')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                  chartMode === 'omzet'
                    ? 'bg-white text-[#0A2A5E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Total Omzet
              </button>
              <button
                onClick={() => setChartMode('breakdown')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                  chartMode === 'breakdown'
                    ? 'bg-white text-[#0A2A5E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Breakdown Metode Bayar
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-80 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                Memuat data grafik 30 hari...
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                Belum ada data transaksi aktif 30 hari terakhir.
              </div>
            ) : chartMode === 'omzet' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A2A5E" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0A2A5E" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `${val / 1000}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as (typeof chartData)[0];
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg text-xs space-y-1.5">
                            <p className="font-bold text-slate-800">{data.formattedDateFull}</p>
                            <div className="border-t border-slate-100 pt-1.5 space-y-1">
                              <p className="font-bold text-[#0A2A5E] text-sm">
                                Omzet: {formatNominal(data.omzet)}
                              </p>
                              <p className="text-slate-600">
                                Transaksi: <span className="font-semibold">{data.jumlah_transaksi} unit</span>
                              </p>
                              <div className="flex gap-2 text-[11px] text-slate-500 pt-1">
                                <span>Tunai: {formatNominal(data.tunai)}</span>
                                <span>•</span>
                                <span>QRIS: {formatNominal(data.qris)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="omzet"
                    stroke="#0A2A5E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorOmzet)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `${val / 1000}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    formatter={(value: any) => formatNominal(value)}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-700 capitalize">{val}</span>}
                  />
                  <Bar dataKey="tunai" name="Tunai" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="qris" name="QRIS" fill="#3B82F6" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="piutang" name="Piutang" fill="#F97316" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2-Column Grid: Payment Method Breakdown & Top Staff Commission */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Col 1: Breakdown Metode Bayar Bulan Ini */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#0A2A5E]" />
                  Metode Bayar (Bulan Ini)
                </h2>
                <span className="text-xs text-slate-400 font-medium">{formatMonthYear(todayStr)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Distribusi penerimaan kas dari seluruh transaksi aktif.
              </p>

              {/* Progress Bars & Cards */}
              <div className="mt-5 space-y-4">
                {/* Tunai */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      Tunai (Cash)
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatNominal(paymentBreakdown.tunai.nominal)}{' '}
                      <span className="text-slate-400 font-normal">({paymentBreakdown.tunai.persen}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${paymentBreakdown.tunai.persen}%` }}
                    />
                  </div>
                </div>

                {/* QRIS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      QRIS / Digital
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatNominal(paymentBreakdown.qris.nominal)}{' '}
                      <span className="text-slate-400 font-normal">({paymentBreakdown.qris.persen}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${paymentBreakdown.qris.persen}%` }}
                    />
                  </div>
                </div>

                {/* Piutang */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-[#F97316]" />
                      Piutang (Tempo)
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatNominal(paymentBreakdown.piutang.nominal)}{' '}
                      <span className="text-slate-400 font-normal">({paymentBreakdown.piutang.persen}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F97316] rounded-full transition-all duration-500"
                      style={{ width: `${paymentBreakdown.piutang.persen}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Penerimaan Kas Langsung (Liquid):</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">
                {formatNominal(
                  (paymentBreakdown.tunai.nominal || 0) + (paymentBreakdown.qris.nominal || 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Kombinasi Tunai & QRIS masuk ke kas harian.
              </p>
            </div>
          </div>

          {/* Col 2 & 3: Top Washer Commission & Quick Laporan Shortcuts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Staff Komisi List */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    Top Komisi Washer & Petugas (30 Hari)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data diambil dari agregasi SQL View <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-mono">komisi_per_staff</code>.
                  </p>
                </div>
                <Link
                  href="/komisi-washer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#F97316] hover:underline"
                >
                  Lihat Semua Staff <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {staffKomisiSummary.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Belum ada data komisi staff.
                  </p>
                ) : (
                  staffKomisiSummary.slice(0, 4).map((s, idx) => (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{s.nama}</p>
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                            {s.role}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-extrabold text-[#0A2A5E]">
                          {formatNominal(s.totalKomisi)}
                        </p>
                        <p className="text-[11px] text-slate-400">Total Komisi Bersih</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Action Navigation to Tahap 3 Reports */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/komisi-washer"
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-purple-50/40 p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="inline-flex rounded-xl bg-purple-100 p-2.5 text-purple-700 mb-3">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    Halaman Komisi Washer
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Rekap komisi per staff dengan filter tanggal, minggu, dan bulan serta kalkulasi multiplier.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-purple-700">
                  <span>Buka Rekap Komisi</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/laporan-bulanan"
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-700 mb-3">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Halaman Laporan Bulanan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tabel omzet bulanan lengkap, perbandingan tahunan, dan fitur Export langsung ke file Excel (.xlsx).
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>Buka Laporan Bulanan</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#0A2A5E]" />
                Transaksi Terbaru (Live Log)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring transaksi cuci mobil/motor yang masuk ke sistem.
              </p>
            </div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline"
            >
              Lihat Semua Transaksi <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Transaksi</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">No. Polisi</th>
                  <th className="px-4 py-3">Kendaraan / Paket</th>
                  <th className="px-4 py-3">Metode Bayar</th>
                  <th className="px-4 py-3 text-right">Harga</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {trx.no_transaksi}
                    </td>
                    <td className="px-4 py-3">{formatDate(trx.tanggal)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{trx.no_polisi}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{trx.paket_nama}</span>{' '}
                      <span className="text-slate-400">({trx.kendaraan} - {trx.tipe})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          trx.metode_bayar === 'Tunai'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : trx.metode_bayar === 'Non Tunai' || trx.metode_bayar === 'Qris'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {trx.metode_bayar}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      {formatNominal(trx.harga)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
