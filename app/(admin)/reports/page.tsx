'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getKomisiPerStaff,
  getStaffList,
  getTransactions,
  getTransactionStaff,
  getLaporanHarian,
  getLaporanHarianRange,
  getLaporanBulanan,
  getKomisiManual,
  addKomisiManual,
  getDailyClosingList,
  getAttendanceList,
} from '@/lib/db';
import { formatNominal, formatRupiah, formatDate, formatDateID } from '@/lib/format';
import {
  KomisiPerStaff,
  Staff,
  Transaction,
  TransactionStaff,
  LaporanHarian,
  LaporanBulanan,
  KomisiManual,
  DailyClosing,
  Attendance,
} from '@/types/database';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  Banknote,
  Award,
  Sparkles,
  Lock,
  Calendar,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldAlert,
  AlertCircle,
  Users,
  DollarSign,
  Receipt,
  ChevronRight,
  Plus,
  RefreshCw,
  BarChart3,
  ChevronLeft,
  Info,
} from 'lucide-react';

type ReportCategory = 'insentif_washer' | 'laporan_omzet' | 'komisi_manual' | 'rekap_tutup_hari';
type PeriodTab = 'harian' | 'mingguan' | 'bulanan';

export default function ReportsMainPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat Laporan & Keuangan...</div>}>
        <ReportsContent />
      </Suspense>
    </AdminLayout>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isOwnerOrSystemOwner = user?.role === 'owner' || user?.role === 'sistem_owner';
  const isSpvOrAbove = user?.role === 'spv' || isOwnerOrSystemOwner;

  // Active Category State
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(() => {
    const cat = searchParams.get('category');
    if (cat === 'laporan_omzet' || cat === 'komisi_manual' || cat === 'rekap_tutup_hari') {
      return cat;
    }
    return 'insentif_washer';
  });

  // Active Tab for Insentif Washer
  const [washerTab, setWasherTab] = useState<PeriodTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'mingguan' || tab === 'bulanan') return tab;
    return 'harian';
  });

  // Active Tab for Laporan Omzet
  const [omzetTab, setOmzetTab] = useState<PeriodTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'mingguan' || tab === 'harian') return tab;
    return 'bulanan';
  });

  // Shared Data States
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // 1. INSENTIF WASHER STATES
  // -------------------------------------------------------------
  // Harian
  const [washerDate, setWasherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyKomisiList, setDailyKomisiList] = useState<KomisiPerStaff[]>([]);
  const [dailyTrxList, setDailyTrxList] = useState<Transaction[]>([]);
  const [dailyStaffTrx, setDailyStaffTrx] = useState<TransactionStaff[]>([]);

  // Mingguan
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [weeklyEndDate, setWeeklyEndDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });
  const [weeklyAttendance, setWeeklyAttendance] = useState<Attendance[]>([]);
  const [weeklyKomisiManual, setWeeklyKomisiManual] = useState<KomisiManual[]>([]);
  const [weeklyStaffKomisi, setWeeklyStaffKomisi] = useState<KomisiPerStaff[]>([]);

  // Bulanan
  const [washerMonth, setWasherMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [monthlyStaffKomisi, setMonthlyStaffKomisi] = useState<KomisiPerStaff[]>([]);

  // -------------------------------------------------------------
  // 2. LAPORAN OMZET STATES
  // -------------------------------------------------------------
  // Harian
  const [omzetDailyStartDate, setOmzetDailyStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [omzetDailyEndDate, setOmzetDailyEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [omzetDailyReports, setOmzetDailyReports] = useState<LaporanHarian[]>([]);

  // Mingguan
  const [omzetWeeklyMonth, setOmzetWeeklyMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [allDailyOmzetForMonth, setAllDailyOmzetForMonth] = useState<LaporanHarian[]>([]);

  // Bulanan
  const [omzetYear, setOmzetYear] = useState<number>(() => new Date().getFullYear());
  const [omzetMonthlyReports, setOmzetMonthlyReports] = useState<LaporanBulanan[]>([]);
  const [allDailyReportsForYear, setAllDailyReportsForYear] = useState<LaporanHarian[]>([]);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 3. KOMISI MANUAL STATES (Khusus Owner / Sistem Owner)
  // -------------------------------------------------------------
  const [manualList, setManualList] = useState<KomisiManual[]>([]);
  const [manualStaffId, setManualStaffId] = useState<number | ''>('');
  const [manualTanggal, setManualTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualKeterangan, setManualKeterangan] = useState<string>('');
  const [manualNominal, setManualNominal] = useState<string>('');
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);
  const [manualErrorMsg, setManualErrorMsg] = useState<string | null>(null);
  const [manualSearch, setManualSearch] = useState<string>('');

  // -------------------------------------------------------------
  // 4. REKAP TUTUP HARI STATES
  // -------------------------------------------------------------
  const [tutupHariDate, setTutupHariDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closingList, setClosingList] = useState<DailyClosing[]>([]);

  // Search filter across list
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Load initial Staff
  useEffect(() => {
    getStaffList().then(setStaffList).catch(console.error);
  }, []);

  // Fetch data depending on active category & tab
  const loadActiveData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeCategory === 'insentif_washer') {
        if (washerTab === 'harian') {
          const [komisi, trxs, staffTrxs] = await Promise.all([
            getKomisiPerStaff({ startDate: washerDate, endDate: washerDate }),
            getTransactions({ startDate: washerDate, endDate: washerDate, status: 'aktif' }),
            getTransactionStaff(),
          ]);
          setDailyKomisiList(komisi);
          setDailyTrxList(trxs);
          setDailyStaffTrx(staffTrxs);
        } else if (washerTab === 'mingguan') {
          const [atts, kmList, kList] = await Promise.all([
            getAttendanceList(weeklyStartDate, weeklyEndDate),
            getKomisiManual(),
            getKomisiPerStaff({ startDate: weeklyStartDate, endDate: weeklyEndDate }),
          ]);
          const filteredKm = kmList.filter(
            (km) => km.tanggal >= weeklyStartDate && km.tanggal <= weeklyEndDate
          );
          setWeeklyAttendance(atts);
          setWeeklyKomisiManual(filteredKm);
          setWeeklyStaffKomisi(kList);
        } else if (washerTab === 'bulanan') {
          const [year, month] = washerMonth.split('-');
          const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
          const start = `${year}-${month}-01`;
          const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          const kList = await getKomisiPerStaff({ startDate: start, endDate: end });
          setMonthlyStaffKomisi(kList);
        }
      } else if (activeCategory === 'laporan_omzet') {
        if (omzetTab === 'harian') {
          const harian = await getLaporanHarianRange(omzetDailyStartDate, omzetDailyEndDate);
          setOmzetDailyReports(harian);
        } else if (omzetTab === 'mingguan') {
          const [year, month] = omzetWeeklyMonth.split('-');
          const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
          const start = `${year}-${month}-01`;
          const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          const monthDays = await getLaporanHarianRange(start, end);
          setAllDailyOmzetForMonth(monthDays);
        } else if (omzetTab === 'bulanan') {
          const [bulanan, harian] = await Promise.all([
            getLaporanBulanan(omzetYear),
            getLaporanHarian(),
          ]);
          setOmzetMonthlyReports(bulanan);
          setAllDailyReportsForYear(harian);
        }
      } else if (activeCategory === 'komisi_manual') {
        const km = await getKomisiManual();
        setManualList(km);
      } else if (activeCategory === 'rekap_tutup_hari') {
        const closings = await getDailyClosingList(tutupHariDate);
        setClosingList(closings);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    activeCategory,
    washerTab,
    washerDate,
    weeklyStartDate,
    weeklyEndDate,
    washerMonth,
    omzetTab,
    omzetDailyStartDate,
    omzetDailyEndDate,
    omzetWeeklyMonth,
    omzetYear,
    tutupHariDate,
  ]);

  useEffect(() => {
    loadActiveData();
  }, [loadActiveData]);

  // Handle Submit Komisi Manual
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualErrorMsg(null);
    setManualSuccessMsg(null);

    if (!manualStaffId) {
      setManualErrorMsg('Silakan pilih staff penerima.');
      return;
    }
    if (!manualKeterangan.trim()) {
      setManualErrorMsg('Keterangan bonus/komisi wajib diisi.');
      return;
    }
    const nominal = Number(manualNominal.replace(/\D/g, ''));
    if (!nominal || nominal <= 0) {
      setManualErrorMsg('Nominal komisi harus lebih besar dari Rp 0.');
      return;
    }

    setManualSubmitting(true);
    try {
      await addKomisiManual({
        staff_id: Number(manualStaffId),
        tanggal: manualTanggal,
        keterangan: manualKeterangan.trim(),
        nominal,
        dientry_oleh: user?.id || null,
        dientry_oleh_nama: user?.nama || 'Owner',
        created_at: new Date().toISOString(),
      });
      setManualSuccessMsg('Komisi manual / bonus berhasil ditambahkan.');
      setManualKeterangan('');
      setManualNominal('');
      setManualStaffId('');
      const km = await getKomisiManual();
      setManualList(km);
    } catch (err: any) {
      setManualErrorMsg(`Gagal menyimpan: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setManualSubmitting(false);
    }
  };

  // Export Excel for Omzet Bulanan
  const handleExportOmzetExcel = () => {
    setExportingExcel(true);
    try {
      const rows = omzetMonthlyReports.map((m) => ({
        Bulan: m.bulan,
        'Total Transaksi': m.jumlah_transaksi,
        'Omzet Total (Rp)': m.omzet,
        'Rata-rata per Transaksi (Rp)':
          m.jumlah_transaksi > 0 ? Math.round(m.omzet / m.jumlah_transaksi) : 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Omzet_${omzetYear}`);
      XLSX.writeFile(wb, `Laporan_Omzet_BSA_${omzetYear}.xlsx`);
    } catch (err) {
      console.error('Export excel error:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  // Weekly Omzet Buckets calculation
  const weeklyOmzetBuckets = useMemo(() => {
    if (!allDailyOmzetForMonth || allDailyOmzetForMonth.length === 0) return [];
    const buckets: {
      label: string;
      rangeText: string;
      totalOmzet: number;
      totalTrx: number;
      days: LaporanHarian[];
    }[] = [
      { label: 'Minggu 1', rangeText: 'Tgl 01 - 07', totalOmzet: 0, totalTrx: 0, days: [] },
      { label: 'Minggu 2', rangeText: 'Tgl 08 - 14', totalOmzet: 0, totalTrx: 0, days: [] },
      { label: 'Minggu 3', rangeText: 'Tgl 15 - 21', totalOmzet: 0, totalTrx: 0, days: [] },
      { label: 'Minggu 4', rangeText: 'Tgl 22 - 28', totalOmzet: 0, totalTrx: 0, days: [] },
      { label: 'Minggu 5', rangeText: 'Tgl 29 - akhir', totalOmzet: 0, totalTrx: 0, days: [] },
    ];

    allDailyOmzetForMonth.forEach((d) => {
      const dayNum = parseInt(d.tanggal.split('-')[2], 10);
      let bIdx = 0;
      if (dayNum >= 1 && dayNum <= 7) bIdx = 0;
      else if (dayNum >= 8 && dayNum <= 14) bIdx = 1;
      else if (dayNum >= 15 && dayNum <= 21) bIdx = 2;
      else if (dayNum >= 22 && dayNum <= 28) bIdx = 3;
      else bIdx = 4;

      buckets[bIdx].totalOmzet += d.omzet;
      buckets[bIdx].totalTrx += d.jumlah_transaksi;
      buckets[bIdx].days.push(d);
    });

    return buckets.filter((b) => b.days.length > 0);
  }, [allDailyOmzetForMonth]);

  return (
    <div id="reports-main-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              📈 Laporan &amp; Keuangan
            </h1>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
              BSA Carwash
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pusat analitik komisi washer, laporan omzet kasir, bonus manual, dan rekap closing harian.
          </p>
        </div>
      </div>

      {/* Main Container: 2-Column Grid with Vertical Categories on Left */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ========================================================= */}
        {/* VERTICAL CATEGORY SELECTOR (Col 1-4)                      */}
        {/* ========================================================= */}
        <aside className="lg:col-span-3 space-y-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kategori Laporan
            </p>
            <nav className="space-y-1">
              {/* 1. Insentif Washer */}
              <button
                id="cat-btn-insentif-washer"
                onClick={() => setActiveCategory('insentif_washer')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === 'insentif_washer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="leading-tight">Insentif Washer</p>
                    <p
                      className={`text-[11px] font-normal ${
                        activeCategory === 'insentif_washer' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Komisi cuci staff
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    activeCategory === 'insentif_washer' ? 'text-white' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* 2. Laporan Omzet */}
              <button
                id="cat-btn-laporan-omzet"
                onClick={() => setActiveCategory('laporan_omzet')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === 'laporan_omzet'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="leading-tight">Laporan Omzet</p>
                    <p
                      className={`text-[11px] font-normal ${
                        activeCategory === 'laporan_omzet' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Pendapatan operasional
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    activeCategory === 'laporan_omzet' ? 'text-white' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* 3. Komisi Manual */}
              <button
                id="cat-btn-komisi-manual"
                onClick={() => setActiveCategory('komisi_manual')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === 'komisi_manual'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎁</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="leading-tight">Komisi Manual</p>
                    </div>
                    <p
                      className={`text-[11px] font-normal ${
                        activeCategory === 'komisi_manual' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Bonus &amp; insentif khusus
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeCategory === 'komisi_manual'
                      ? 'bg-blue-700 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Owner
                </span>
              </button>

              {/* 4. Rekap Tutup Hari */}
              <button
                id="cat-btn-rekap-tutup-hari"
                onClick={() => setActiveCategory('rekap_tutup_hari')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === 'rekap_tutup_hari'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="leading-tight">Rekap Tutup Hari</p>
                    <p
                      className={`text-[11px] font-normal ${
                        activeCategory === 'rekap_tutup_hari' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Riwayat closing kasir
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    activeCategory === 'rekap_tutup_hari' ? 'text-white' : 'text-slate-400'
                  }`}
                />
              </button>
            </nav>
          </div>

          {/* Quick Info Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Info className="h-4 w-4 text-blue-600" />
              <span>Petunjuk Akses</span>
            </div>
            <p className="mt-1.5 leading-relaxed text-slate-500">
              Pilih salah satu kategori vertikal di atas untuk menampilkan data dan tab periode yang sesuai.
            </p>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT AREA (Col 4-12)                              */}
        {/* ========================================================= */}
        <main className="lg:col-span-9 space-y-6">
          {/* ------------------------------------------------------- */}
          {/* 1. KATEGORI: INSENTIF WASHER                            */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'insentif_washer' && (
            <div className="space-y-6">
              {/* Category Header & Horizontal Tabs */}
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>💰</span> Insentif Washer
                  </h2>
                  <p className="text-xs text-slate-500">
                    Perhitungan komisi pengerjaan cuci staff berdasarkan unit dan presensi harian
                  </p>
                </div>

                {/* HORIZONTAL TABS: [Harian] [Mingguan] [Bulanan] */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    id="tab-washer-harian"
                    onClick={() => setWasherTab('harian')}
                    className={`rounded-lg px-4 py-2 transition ${
                      washerTab === 'harian'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    id="tab-washer-mingguan"
                    onClick={() => setWasherTab('mingguan')}
                    className={`rounded-lg px-4 py-2 transition ${
                      washerTab === 'mingguan'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    id="tab-washer-bulanan"
                    onClick={() => setWasherTab('bulanan')}
                    className={`rounded-lg px-4 py-2 transition ${
                      washerTab === 'bulanan'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>

              {/* TAB CONTENT: HARIAN */}
              {washerTab === 'harian' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Pilih Tanggal:</span>
                      <input
                        type="date"
                        value={washerDate}
                        onChange={(e) => setWasherDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setWasherDate(new Date().toISOString().split('T')[0])}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Hari Ini
                      </button>
                      <button
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() - 1);
                          setWasherDate(d.toISOString().split('T')[0]);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Kemarin
                      </button>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Komisi Harian</span>
                      <p className="mt-2 text-xl font-bold font-mono text-blue-700">
                        {formatRupiah(
                          dailyKomisiList.reduce((acc, k) => acc + (k.total_komisi || 0), 0)
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDateID(washerDate)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Washer Bertugas</span>
                      <p className="mt-2 text-xl font-bold text-slate-900">
                        {dailyKomisiList.filter((k) => (k.total_komisi || 0) > 0).length} Staff
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">Dari total staff terdaftar</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Unit Cuci</span>
                      <p className="mt-2 text-xl font-bold text-emerald-600">
                        {dailyTrxList.length} Kendaraan
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">Status selesai dikerjakan</p>
                    </div>
                  </div>

                  {/* Table Rincian Komisi Washer Harian */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">
                        Akumulasi Komisi per Staff - {formatDateID(washerDate)}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Nama Staff</th>
                            <th className="px-5 py-3 font-semibold">Role</th>
                            <th className="px-5 py-3 font-semibold text-center">Unit Dikerjakan</th>
                            <th className="px-5 py-3 font-semibold text-right">Total Komisi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {dailyKomisiList.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                                Tidak ada data komisi pada tanggal {washerDate}.
                              </td>
                            </tr>
                          ) : (
                            dailyKomisiList.map((k) => (
                              <tr key={k.id || k.staff_id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-medium text-slate-900">
                                  {k.nama || k.staff_nama}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
                                    {k.role}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center font-bold text-slate-800">
                                  {k.total_transaksi || '-'}
                                </td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-blue-600">
                                  {formatRupiah(k.total_komisi)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: MINGGUAN */}
              {washerTab === 'mingguan' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600">Periode:</span>
                      <input
                        type="date"
                        value={weeklyStartDate}
                        onChange={(e) => setWeeklyStartDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium"
                      />
                      <span className="text-slate-400">s/d</span>
                      <input
                        type="date"
                        value={weeklyEndDate}
                        onChange={(e) => setWeeklyEndDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium"
                      />
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      {weeklyStartDate} - {weeklyEndDate}
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Komisi Cuci</span>
                      <p className="mt-2 text-xl font-bold font-mono text-blue-700">
                        {formatRupiah(
                          weeklyStaffKomisi.reduce((acc, k) => acc + (k.total_komisi || 0), 0)
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">Periode mingguan berjalan</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Bonus Manual</span>
                      <p className="mt-2 text-xl font-bold font-mono text-amber-600">
                        {formatRupiah(
                          weeklyKomisiManual.reduce((acc, km) => acc + (km.nominal || 0), 0)
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">Input khusus owner</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Grand Total Insentif</span>
                      <p className="mt-2 text-xl font-bold font-mono text-emerald-600">
                        {formatRupiah(
                          weeklyStaffKomisi.reduce((acc, k) => acc + (k.total_komisi || 0), 0) +
                            weeklyKomisiManual.reduce((acc, km) => acc + (km.nominal || 0), 0)
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">Komisi cuci + bonus manual</p>
                    </div>
                  </div>

                  {/* Table Rekap Insentif Mingguan */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">
                        Rekap Insentif Mingguan Staff
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Nama Staff</th>
                            <th className="px-5 py-3 font-semibold">Role</th>
                            <th className="px-5 py-3 font-semibold text-center">Hari Hadir</th>
                            <th className="px-5 py-3 font-semibold text-center">Multiplier</th>
                            <th className="px-5 py-3 font-semibold text-right">Komisi Cuci</th>
                            <th className="px-5 py-3 font-semibold text-right">Bonus Manual</th>
                            <th className="px-5 py-3 font-semibold text-right">Total Insentif</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {staffList.map((st) => {
                            const attHadir = weeklyAttendance.filter(
                              (a) => a.staff_id === st.id && a.status === 'Hadir'
                            ).length;
                            const cuci =
                              weeklyStaffKomisi.find((k) => k.id === st.id || k.staff_id === st.id)?.total_komisi || 0;
                            const manual = weeklyKomisiManual
                              .filter((km) => km.staff_id === st.id)
                              .reduce((sum, km) => sum + (km.nominal || 0), 0);
                            const total = cuci + manual;

                            return (
                              <tr key={st.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-semibold text-slate-900">{st.nama}</td>
                                <td className="px-5 py-3 capitalize">{st.role}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                                    {attHadir} Hari
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center font-mono">
                                  {st.latest_multiplier ? `x${st.latest_multiplier}` : '-'}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-blue-600">
                                  {formatRupiah(cuci)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-amber-600">
                                  {formatRupiah(manual)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">
                                  {formatRupiah(total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: BULANAN */}
              {washerTab === 'bulanan' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600">Pilih Bulan:</span>
                      <input
                        type="month"
                        value={washerMonth}
                        onChange={(e) => setWasherMonth(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Rekap Komisi Bulanan Staff
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Peringkat</th>
                          <th className="px-5 py-3 font-semibold">Nama Staff</th>
                          <th className="px-5 py-3 font-semibold">Role</th>
                          <th className="px-5 py-3 font-semibold text-center">Total Unit Dicuci</th>
                          <th className="px-5 py-3 font-semibold text-right">Akumulasi Komisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {monthlyStaffKomisi.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                              Belum ada data komisi untuk bulan {washerMonth}.
                            </td>
                          </tr>
                        ) : (
                          monthlyStaffKomisi.map((k, idx) => (
                            <tr key={k.id || k.staff_id || idx} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-bold text-slate-400">#{idx + 1}</td>
                              <td className="px-5 py-3 font-semibold text-slate-900">
                                {k.nama || k.staff_nama}
                              </td>
                              <td className="px-5 py-3 capitalize">{k.role}</td>
                              <td className="px-5 py-3 text-center font-bold text-slate-800">
                                {k.total_transaksi || '-'}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-blue-600">
                                {formatRupiah(k.total_komisi)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* 2. KATEGORI: LAPORAN OMZET                              */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'laporan_omzet' && (
            <div className="space-y-6">
              {/* Category Header & Horizontal Tabs */}
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>📊</span> Laporan Omzet
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rekapitulasi pendapatan operasional, metode pembayaran tunai/qris/piutang/promo
                  </p>
                </div>

                {/* HORIZONTAL TABS: [Harian] [Mingguan] [Bulanan] */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    id="tab-omzet-harian"
                    onClick={() => setOmzetTab('harian')}
                    className={`rounded-lg px-4 py-2 transition ${
                      omzetTab === 'harian'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    id="tab-omzet-mingguan"
                    onClick={() => setOmzetTab('mingguan')}
                    className={`rounded-lg px-4 py-2 transition ${
                      omzetTab === 'mingguan'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    id="tab-omzet-bulanan"
                    onClick={() => setOmzetTab('bulanan')}
                    className={`rounded-lg px-4 py-2 transition ${
                      omzetTab === 'bulanan'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>

              {/* TAB OMZET: HARIAN */}
              {omzetTab === 'harian' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">Rentang Tanggal:</span>
                      <input
                        type="date"
                        value={omzetDailyStartDate}
                        onChange={(e) => setOmzetDailyStartDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                      />
                      <span className="text-slate-400">s/d</span>
                      <input
                        type="date"
                        value={omzetDailyEndDate}
                        onChange={(e) => setOmzetDailyEndDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Omzet</span>
                      <p className="mt-2 text-xl font-bold font-mono text-blue-700">
                        {formatRupiah(
                          omzetDailyReports.reduce((acc, r) => acc + (r.omzet || 0), 0)
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Tunai</span>
                      <p className="mt-2 text-xl font-bold font-mono text-emerald-600">
                        {formatRupiah(
                          omzetDailyReports.reduce((acc, r) => acc + (r.tunai || 0), 0)
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total QRIS</span>
                      <p className="mt-2 text-xl font-bold font-mono text-purple-600">
                        {formatRupiah(
                          omzetDailyReports.reduce((acc, r) => acc + (r.qris || 0), 0)
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500">Total Piutang</span>
                      <p className="mt-2 text-xl font-bold font-mono text-rose-600">
                        {formatRupiah(
                          omzetDailyReports.reduce((acc, r) => acc + (r.piutang || 0), 0)
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Table Rincian Omzet Harian */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">Daftar Omzet Harian</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Tanggal</th>
                            <th className="px-5 py-3 font-semibold text-center">Trx</th>
                            <th className="px-5 py-3 font-semibold text-right">Tunai</th>
                            <th className="px-5 py-3 font-semibold text-right">QRIS</th>
                            <th className="px-5 py-3 font-semibold text-right">Piutang</th>
                            <th className="px-5 py-3 font-semibold text-right">Promo</th>
                            <th className="px-5 py-3 font-semibold text-right">Total Omzet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {omzetDailyReports.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                Tidak ada data omzet untuk periode ini.
                              </td>
                            </tr>
                          ) : (
                            omzetDailyReports.map((r) => (
                              <tr key={r.tanggal} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-medium text-slate-900">
                                  {formatDateID(r.tanggal)}
                                </td>
                                <td className="px-5 py-3 text-center font-bold text-slate-800">
                                  {r.jumlah_transaksi}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-emerald-600">
                                  {formatRupiah(r.tunai)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-purple-600">
                                  {formatRupiah(r.qris)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-rose-600">
                                  {formatRupiah(r.piutang)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-slate-500">
                                  {formatRupiah(r.promo || 0)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-blue-700">
                                  {formatRupiah(r.omzet)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB OMZET: MINGGUAN */}
              {omzetTab === 'mingguan' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">Pilih Bulan Analisis:</span>
                      <input
                        type="month"
                        value={omzetWeeklyMonth}
                        onChange={(e) => setOmzetWeeklyMonth(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium"
                      />
                    </div>
                    <span className="font-semibold text-slate-500">
                      Distribusi Omzet per Minggu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {weeklyOmzetBuckets.map((b) => (
                      <div
                        key={b.label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                            {b.label}
                          </span>
                          <span className="text-xs text-slate-400">{b.rangeText}</span>
                        </div>
                        <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
                          {formatRupiah(b.totalOmzet)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {b.totalTrx} transaksi selesai ({b.days.length} hari operasional)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB OMZET: BULANAN */}
              {omzetTab === 'bulanan' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600">Pilih Tahun:</span>
                      <select
                        value={omzetYear}
                        onChange={(e) => setOmzetYear(Number(e.target.value))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold"
                      >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                      </select>
                    </div>

                    <button
                      onClick={handleExportOmzetExcel}
                      disabled={exportingExcel || omzetMonthlyReports.length === 0}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>{exportingExcel ? 'Mengexport...' : 'Export ke Excel'}</span>
                    </button>
                  </div>

                  {/* Table Rekap Bulanan */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">
                        Rekap Omzet Bulanan - Tahun {omzetYear}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Bulan</th>
                            <th className="px-5 py-3 font-semibold text-center">Jumlah Transaksi</th>
                            <th className="px-5 py-3 font-semibold text-right">Rata-rata per Transaksi</th>
                            <th className="px-5 py-3 font-semibold text-right">Total Omzet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {omzetMonthlyReports.map((m) => (
                            <tr key={m.bulan} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-bold text-slate-900">{m.bulan}</td>
                              <td className="px-5 py-3 text-center font-semibold text-slate-800">
                                {m.jumlah_transaksi}
                              </td>
                              <td className="px-5 py-3 text-right font-mono text-slate-600">
                                {formatRupiah(
                                  m.jumlah_transaksi > 0 ? Math.round(m.omzet / m.jumlah_transaksi) : 0
                                )}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-blue-700">
                                {formatRupiah(m.omzet)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* 3. KATEGORI: KOMISI MANUAL (Halaman Tunggal)            */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'komisi_manual' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>🎁</span> Komisi Manual &amp; Bonus
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pencatatan bonus insentif bebas (cuci jok, cuci karpet, bonus lembur harian).
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    Khusus Owner / Sistem Owner
                  </span>
                </div>
              </div>

              {!isOwnerOrSystemOwner ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
                  <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
                  <h3 className="mt-3 text-base font-bold">Halaman Khusus Owner</h3>
                  <p className="mt-1 text-xs text-amber-700 max-w-md mx-auto">
                    Menu Komisi Manual hanya dapat diakses oleh user dengan role <strong>Owner</strong> atau <strong>Sistem Owner</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Form Input Komisi Manual */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      <span>Input Bonus / Komisi Manual Baru</span>
                    </h3>

                    {manualErrorMsg && (
                      <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
                        {manualErrorMsg}
                      </div>
                    )}
                    {manualSuccessMsg && (
                      <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
                        {manualSuccessMsg}
                      </div>
                    )}

                    <form onSubmit={handleAddManual} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700">Pilih Staff *</label>
                        <select
                          value={manualStaffId}
                          onChange={(e) => setManualStaffId(e.target.value ? Number(e.target.value) : '')}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Pilih Staff --</option>
                          {staffList.filter((s) => s.aktif).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nama} ({s.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700">Tanggal *</label>
                        <input
                          type="date"
                          value={manualTanggal}
                          onChange={(e) => setManualTanggal(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700">Nominal (Rp) *</label>
                        <input
                          type="text"
                          placeholder="misal 50.000"
                          value={manualNominal}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setManualNominal(val ? Number(val).toLocaleString('id-ID') : '');
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700">Keterangan *</label>
                        <input
                          type="text"
                          placeholder="Cuci Karpet / Bonus"
                          value={manualKeterangan}
                          onChange={(e) => setManualKeterangan(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={manualSubmitting}
                          className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {manualSubmitting ? 'Menyimpan...' : 'Simpan Komisi Manual'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Table Riwayat Komisi Manual */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">Riwayat Komisi Manual</h3>
                      <input
                        type="text"
                        placeholder="Cari staff / keterangan..."
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Tanggal</th>
                            <th className="px-5 py-3 font-semibold">Nama Staff</th>
                            <th className="px-5 py-3 font-semibold">Keterangan</th>
                            <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                            <th className="px-5 py-3 font-semibold">Dientry Oleh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {manualList
                            .filter(
                              (m) =>
                                !manualSearch ||
                                m.staff_nama?.toLowerCase().includes(manualSearch.toLowerCase()) ||
                                m.keterangan?.toLowerCase().includes(manualSearch.toLowerCase())
                            )
                            .map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-medium text-slate-900">
                                  {formatDateID(m.tanggal)}
                                </td>
                                <td className="px-5 py-3 font-semibold text-slate-900">{m.staff_nama}</td>
                                <td className="px-5 py-3 text-slate-600">{m.keterangan}</td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-amber-600">
                                  {formatRupiah(m.nominal)}
                                </td>
                                <td className="px-5 py-3 text-slate-500">{m.dientry_oleh_nama || 'Owner'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* 4. KATEGORI: REKAP TUTUP HARI (Halaman Tunggal)          */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'rekap_tutup_hari' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🔒</span> Rekap Tutup Hari Kasir
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pemeriksaan status penutupan kasir harian dan rincian omzet per kasir.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">Pilih Tanggal:</span>
                  <input
                    type="date"
                    value={tutupHariDate}
                    onChange={(e) => setTutupHariDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Table Closing List */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                  <h3 className="text-sm font-bold text-slate-800">
                    Riwayat Closing Kasir - {formatDateID(tutupHariDate)}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Kasir</th>
                        <th className="px-5 py-3 font-semibold text-center">Trx Selesai</th>
                        <th className="px-5 py-3 font-semibold text-right">Tunai</th>
                        <th className="px-5 py-3 font-semibold text-right">QRIS</th>
                        <th className="px-5 py-3 font-semibold text-right">Piutang</th>
                        <th className="px-5 py-3 font-semibold text-right">Promo</th>
                        <th className="px-5 py-3 font-semibold text-right">Total Omzet</th>
                        <th className="px-5 py-3 font-semibold text-center">Waktu Closing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {closingList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                            Belum ada kasir yang melakukan Tutup Hari pada tanggal {tutupHariDate}.
                          </td>
                        </tr>
                      ) : (
                        closingList.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-semibold text-slate-900">{c.kasir_nama || 'Kasir'}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">
                              {c.total_transaksi}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-emerald-600">
                              {formatRupiah(c.total_tunai)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-purple-600">
                              {formatRupiah(c.total_qris)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-rose-600">
                              {formatRupiah(c.total_piutang)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-slate-500">
                              {formatRupiah(c.total_promo)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-blue-700">
                              {formatRupiah(c.total_omzet)}
                            </td>
                            <td className="px-5 py-3 text-center text-slate-500">
                              {c.ditutup_pada ? new Date(c.ditutup_pada).toLocaleTimeString('id-ID') : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
