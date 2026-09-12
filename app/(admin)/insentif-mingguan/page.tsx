'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { StaffWeeklyIncentive, KomisiManual } from '@/types/database';
import { getWeeklyIncentives, getTransactions, getTransactionStaff } from '@/lib/db';
import {
  formatNominal,
  formatDate,
  getMondayAndSundayOfWeek,
  getIndonesianDayName,
  toInputDate,
} from '@/lib/format';
import * as XLSX from 'xlsx';
import {
  Banknote,
  Calendar,
  Download,
  FileSpreadsheet,
  Users,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Search,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Receipt,
  Layers,
  Info,
  X,
} from 'lucide-react';

export default function InsentifMingguanPage() {
  const { user, isSpv, isOwner, isSistemOwner } = useAuth();
  // SPV, Owner, and Sistem Owner can view and export weekly incentives
  const isAuthorized = isSpv || isOwner || isSistemOwner;

  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Week range state: Monday to Sunday
  // Context date: 2026-09-12 (Saturday) -> Monday: 2026-09-07, Sunday: 2026-09-13
  const defaultWeek = getMondayAndSundayOfWeek('2026-09-12');
  const [startDate, setStartDate] = useState<string>(defaultWeek.monday);
  const [endDate, setEndDate] = useState<string>(defaultWeek.sunday);
  const [selectedPreset, setSelectedPreset] = useState<string>('this_week');

  const [incentiveData, setIncentiveData] = useState<StaffWeeklyIncentive[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'total' | 'cuci' | 'manual' | 'hadir'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail Modal State
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<{
    staff: StaffWeeklyIncentive;
    dailyBreakdown: { tanggal: string; dayName: string; units: number; komisiCuci: number }[];
  } | null>(null);

  // Load incentive data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWeeklyIncentives(startDate, endDate);
      setIncentiveData(data);
    } catch (err) {
      console.error('Error loading weekly incentives:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, loadData]);

  // Preset week buttons
  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'this_week') {
      const w = getMondayAndSundayOfWeek('2026-09-12');
      setStartDate(w.monday);
      setEndDate(w.sunday);
    } else if (preset === 'last_week') {
      // 7 days before
      const w = getMondayAndSundayOfWeek('2026-09-05');
      setStartDate(w.monday);
      setEndDate(w.sunday);
    } else if (preset === 'week_3') {
      const w = getMondayAndSundayOfWeek('2026-08-28');
      setStartDate(w.monday);
      setEndDate(w.sunday);
    } else if (preset === 'week_2') {
      const w = getMondayAndSundayOfWeek('2026-08-21');
      setStartDate(w.monday);
      setEndDate(w.sunday);
    }
  };

  // Navigate by week (-1 week or +1 week)
  const changeWeek = (direction: number) => {
    const [y, m, d] = startDate.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    mon.setDate(mon.getDate() + direction * 7);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    setStartDate(toInputDate(mon));
    setEndDate(toInputDate(sun));
    setSelectedPreset('custom');
  };

  // Open detail breakdown modal
  const handleOpenDetail = async (staff: StaffWeeklyIncentive) => {
    try {
      const [allTrxs, allStaffTrxs] = await Promise.all([
        getTransactions({ status: 'aktif' }),
        getTransactionStaff(),
      ]);

      const trxMap = new Map();
      for (const t of allTrxs) {
        if (t.status === 'aktif' && t.tanggal >= startDate && t.tanggal <= endDate) {
          trxMap.set(t.id, t);
        }
      }

      // Group per date
      const days: { tanggal: string; dayName: string; units: number; komisiCuci: number }[] = [];
      const [y1, m1, d1] = startDate.split('-').map(Number);
      const [y2, m2, d2] = endDate.split('-').map(Number);
      const startD = new Date(y1, m1 - 1, d1);
      const endD = new Date(y2, m2 - 1, d2);

      for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
        const dateStr = toInputDate(cur);
        const dayName = getIndonesianDayName(cur);

        // Find transactions for this staff on this day
        let dayUnits = 0;
        let dayKomisi = 0;

        for (const st of allStaffTrxs) {
          if (st.staff_id === staff.staff_id) {
            const trx = trxMap.get(st.transaction_id);
            if (trx && trx.tanggal === dateStr) {
              dayUnits++;
              dayKomisi += st.komisi;
            }
          }
        }

        days.push({
          tanggal: dateStr,
          dayName,
          units: dayUnits,
          komisiCuci: dayKomisi,
        });
      }

      setSelectedStaffDetail({
        staff,
        dailyBreakdown: days,
      });
    } catch (err) {
      console.error('Error opening detail:', err);
    }
  };

  // Totals
  const totals = useMemo(() => {
    let totalInsentif = 0;
    let totalCuci = 0;
    let totalManual = 0;
    let totalUnits = 0;

    for (const item of incentiveData) {
      totalInsentif += item.total_insentif;
      totalCuci += item.komisi_cuci;
      totalManual += item.komisi_manual;
      totalUnits += item.total_unit_cuci;
    }

    return { totalInsentif, totalCuci, totalManual, totalUnits };
  }, [incentiveData]);

  // Filtered & Sorted Data
  const filteredAndSortedData = useMemo(() => {
    return incentiveData
      .filter((item) => {
        const matchRole = roleFilter === 'all' || item.role === roleFilter;
        const matchSearch =
          searchQuery === '' ||
          item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.role.toLowerCase().includes(searchQuery.toLowerCase());
        return matchRole && matchSearch;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortField === 'total') {
          valA = a.total_insentif;
          valB = b.total_insentif;
        } else if (sortField === 'cuci') {
          valA = a.komisi_cuci;
          valB = b.komisi_cuci;
        } else if (sortField === 'manual') {
          valA = a.komisi_manual;
          valB = b.komisi_manual;
        } else if (sortField === 'hadir') {
          valA = a.hari_hadir;
          valB = b.hari_hadir;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [incentiveData, roleFilter, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: 'total' | 'cuci' | 'manual' | 'hadir') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // =============================================================
  // EXPORT REKAP INSENTIF MINGGUAN KE EXCEL (Tahap 5)
  // =============================================================
  const handleExportExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // -----------------------------------------------------------
      // Sheet 1: Rekap Gaji & Insentif
      // -----------------------------------------------------------
      const sheet1Data: any[][] = [
        ['BSA CAR WASH - REKAPITULASI INSENTIF MINGGUAN'],
        [`Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)} (Senin - Minggu)`],
        [`Tanggal Cetak: ${formatDate(new Date())} - Dicetak oleh: ${user?.nama || 'SPV/Owner'}`],
        [], // empty row
        [
          'No',
          'ID Staff',
          'Nama Staff',
          'Peran',
          'Hari Hadir',
          'Unit Dikerjakan',
          'Komisi Cuci Reguler',
          'Komisi Manual (Extra)',
          'Multiplier',
          'Total Insentif (Gaji)',
          'Tanda Tangan Penerima',
        ],
      ];

      filteredAndSortedData.forEach((item, index) => {
        sheet1Data.push([
          index + 1,
          item.staff_id,
          item.nama,
          item.role.toUpperCase(),
          `${item.hari_hadir} Hari`,
          `${item.total_unit_cuci} Unit`,
          item.komisi_cuci,
          item.komisi_manual,
          item.multiplier > 0 ? `+${item.multiplier}%` : '0%',
          item.total_insentif,
          '', // Signature box
        ]);
      });

      // Append Total Row
      sheet1Data.push([
        '',
        '',
        'TOTAL KESELURUHAN',
        '',
        '',
        `${totals.totalUnits} Unit`,
        totals.totalCuci,
        totals.totalManual,
        '',
        totals.totalInsentif,
        '',
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
      ws1['!cols'] = [
        { wch: 6 },
        { wch: 10 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 22 },
        { wch: 22 },
        { wch: 12 },
        { wch: 24 },
        { wch: 25 },
      ];

      // -----------------------------------------------------------
      // Sheet 2: Rincian Komisi Manual (Pekerjaan Tambahan)
      // -----------------------------------------------------------
      const sheet2Data: any[][] = [
        ['RINCIAN KOMISI MANUAL (CUCI KARPET / JOK / DETILING EXTRA)'],
        [`Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}`],
        [],
        ['No', 'Tanggal', 'Nama Staff', 'Peran', 'Keterangan Pekerjaan', 'Nominal Komisi', 'Dientry Oleh'],
      ];

      let manualIndex = 1;
      filteredAndSortedData.forEach((staff) => {
        staff.rincian_manual.forEach((m) => {
          sheet2Data.push([
            manualIndex++,
            formatDate(m.tanggal),
            staff.nama,
            staff.role.toUpperCase(),
            m.keterangan,
            m.nominal,
            m.dientry_oleh_nama || 'Owner/Admin',
          ]);
        });
      });

      if (manualIndex === 1) {
        sheet2Data.push(['-', '-', 'Tidak ada komisi manual pada periode ini', '-', '-', 0, '-']);
      }

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
      ws2['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 22 },
        { wch: 14 },
        { wch: 35 },
        { wch: 18 },
        { wch: 22 },
      ];

      // Append Sheets to Workbook
      XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Insentif Gaji');
      XLSX.utils.book_append_sheet(wb, ws2, 'Rincian Komisi Manual');

      // Trigger Download
      const fileName = `BSA_Carwash_Insentif_Mingguan_${startDate}_sd_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div id="unauthorized-card" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <ShieldCheck className="mx-auto h-12 w-12 text-red-500 mb-2" />
          <h2 className="text-lg font-bold">Akses Dibatasi</h2>
          <p className="text-sm mt-1">Halaman rekap insentif mingguan hanya dapat diakses oleh SPV Keuangan, Owner, dan Sistem Owner.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div id="insentif-mingguan-page" className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Rekap Insentif Mingguan
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Penggabungan komisi cuci kasir dan komisi manual (cuci karpet/jok) per staff periode Senin - Minggu untuk pembayaran gaji
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              id="btn-link-komisi-washer"
              href="/komisi-washer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Award className="h-4 w-4 text-amber-600" />
              Komisi Washer
            </Link>
            <Link
              id="btn-link-absensi-harian"
              href="/absensi"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <UserCheck className="h-4 w-4 text-[#0A2A5E]" />
              Absensi Harian
            </Link>
            <button
              id="btn-export-excel-insentif"
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Mengekspor Excel...' : 'Export Excel Gaji'}
            </button>
          </div>
        </div>

        {/* Informational Card */}
        <div id="info-insentif-card" className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-emerald-900">
          <Info className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="text-xs leading-relaxed text-emerald-800">
            <span className="font-bold text-emerald-900">Formula Insentif Mingguan:</span> Total Insentif dihitung dari akumulasi <span className="font-semibold text-emerald-900">Komisi Cuci Reguler</span> (berdasarkan transaksi kasir aktif termasuk multiplier persen staff) <span className="font-bold text-emerald-950">+</span> <span className="font-semibold text-emerald-900">Komisi Manual</span> (pekerjaan tambahan seperti cuci karpet, jok, salon interior). Data kehadiran staff diambil langsung dari tabel <span className="font-semibold">Absensi Harian</span>.
          </div>
        </div>

        {/* Week Period Selector Bar */}
        <div id="week-selector-card" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pilihan Minggu:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'this_week', label: 'Minggu Ini (07-13 Sep)' },
                { key: 'last_week', label: 'Minggu Lalu (31 Agu-06 Sep)' },
                { key: 'week_3', label: 'Minggu 3 (24-30 Agu)' },
                { key: 'week_2', label: 'Minggu 2 (17-23 Agu)' },
              ].map((p) => (
                <button
                  key={p.key}
                  id={`btn-preset-${p.key}`}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    selectedPreset === p.key
                      ? 'bg-[#0A2A5E] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 p-1">
              <button
                id="btn-prev-week"
                type="button"
                onClick={() => changeWeek(-1)}
                className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="1 Minggu Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center px-2 text-xs font-bold text-slate-800">
                <input
                  id="input-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="bg-transparent focus:outline-none"
                />
                <span className="mx-1 text-slate-400">s/d</span>
                <input
                  id="input-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="bg-transparent focus:outline-none"
                />
              </div>
              <button
                id="btn-next-week"
                type="button"
                onClick={() => changeWeek(1)}
                className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="1 Minggu Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div id="kpi-insentif-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div id="kpi-total-insentif" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Total Insentif Gaji</span>
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-800">
                {formatNominal(totals.totalInsentif)}
              </span>
              <p className="text-[11px] font-medium text-emerald-600 mt-0.5">Semua staff operasional</p>
            </div>
          </div>

          <div id="kpi-komisi-cuci" className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">Komisi Cuci Reguler</span>
              <Receipt className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-800">
                {formatNominal(totals.totalCuci)}
              </span>
              <p className="text-[11px] font-medium text-blue-600 mt-0.5">Dari transaksi kasir</p>
            </div>
          </div>

          <div id="kpi-komisi-manual" className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Komisi Manual (Extra)</span>
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-800">
                {formatNominal(totals.totalManual)}
              </span>
              <p className="text-[11px] font-medium text-amber-600 mt-0.5">Cuci karpet, jok, interior</p>
            </div>
          </div>

          <div id="kpi-total-unit" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Unit Cuci</span>
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totals.totalUnits}</span>
              <span className="text-xs text-slate-500">mobil/motor</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Periode {formatDate(startDate)} - {formatDate(endDate)}</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div id="filter-bar-insentif" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Peran:</span>
            {['all', 'washer', 'checker', 'leader'].map((role) => (
              <button
                key={role}
                id={`btn-filter-role-${role}`}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                  roleFilter === role
                    ? 'bg-[#0A2A5E] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'all' ? 'Semua Peran' : role}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              id="input-search-staff-insentif"
              type="text"
              placeholder="Cari staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0A2A5E] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Table of Staff Incentives */}
        <div id="table-container-insentif" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="mt-3 text-xs font-medium">Menghitung rekap insentif mingguan...</p>
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Banknote className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada data insentif pada periode ini</p>
              <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau rentang tanggal minggu yang dipilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="table-insentif-staff" className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700">
                    <th className="px-3.5 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Nama Staff</th>
                    <th className="px-3 py-3">Peran</th>
                    <th
                      className="px-3 py-3 text-center cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSort('hadir')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Hari Hadir</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center">Unit Cuci</th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSort('cuci')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Komisi Cuci</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSort('manual')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Komisi Manual</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center">Multiplier</th>
                    <th
                      className="px-4 py-3 text-right bg-emerald-50/70 text-emerald-900 font-bold cursor-pointer hover:bg-emerald-100/70"
                      onClick={() => toggleSort('total')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Insentif</span>
                        <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                      </div>
                    </th>
                    <th className="px-3.5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedData.map((item, idx) => (
                    <tr
                      key={item.staff_id}
                      id={`row-insentif-staff-${item.staff_id}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3.5 py-3.5 text-center font-semibold text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.nama}</div>
                        <span className="text-[10px] text-slate-400">ID: #{item.staff_id}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.role === 'leader'
                              ? 'bg-amber-100 text-amber-800'
                              : item.role === 'checker'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            item.hari_hadir >= 6
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.hari_hadir >= 4
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {item.hari_hadir} Hari
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center font-bold text-slate-800">
                        {item.total_unit_cuci} Unit
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                        {formatNominal(item.komisi_cuci)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {item.komisi_manual > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-amber-700">
                              {formatNominal(item.komisi_manual)}
                            </span>
                            <span className="text-[10px] text-amber-600">
                              ({item.rincian_manual.length} pekerjaan)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {item.multiplier > 0 ? (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-bold text-purple-800">
                            +{item.multiplier}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right bg-emerald-50/40 font-black text-emerald-700 text-sm">
                        {formatNominal(item.total_insentif)}
                      </td>
                      <td className="px-3.5 py-3.5 text-center">
                        <button
                          id={`btn-detail-staff-${item.staff_id}`}
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 transition"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#0A2A5E]" />
                          Rincian
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                    <td colSpan={4} className="px-4 py-3.5 text-right">
                      TOTAL ({filteredAndSortedData.length} Staff):
                    </td>
                    <td className="px-3 py-3.5 text-center text-slate-900 font-black">
                      {totals.totalUnits} Unit
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900">
                      {formatNominal(totals.totalCuci)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-amber-700">
                      {formatNominal(totals.totalManual)}
                    </td>
                    <td className="px-3 py-3.5 text-center text-slate-400">-</td>
                    <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-base bg-emerald-100/50">
                      {formatNominal(totals.totalInsentif)}
                    </td>
                    <td className="px-3.5 py-3.5 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Staff Detail Breakdown Modal */}
        {selectedStaffDetail && (
          <div
            id="detail-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <div
              id="detail-modal"
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedStaffDetail.staff.nama}
                    </h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                      {selectedStaffDetail.staff.role}
                    </span>
                    {selectedStaffDetail.staff.multiplier > 0 && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-bold text-purple-800">
                        +{selectedStaffDetail.staff.multiplier}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Periode: {formatDate(startDate)} s/d {formatDate(endDate)} • Kehadiran: {selectedStaffDetail.staff.hari_hadir} Hari
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStaffDetail(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
                {/* 3 Summary Pills */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                    <span className="text-[11px] font-medium text-blue-700">Komisi Cuci Reguler</span>
                    <div className="text-base font-black text-blue-900 mt-1">
                      {formatNominal(selectedStaffDetail.staff.komisi_cuci)}
                    </div>
                    <span className="text-[10px] text-blue-600">
                      {selectedStaffDetail.staff.total_unit_cuci} unit cuci
                    </span>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <span className="text-[11px] font-medium text-amber-700">Komisi Manual (Extra)</span>
                    <div className="text-base font-black text-amber-900 mt-1">
                      {formatNominal(selectedStaffDetail.staff.komisi_manual)}
                    </div>
                    <span className="text-[10px] text-amber-600">
                      {selectedStaffDetail.staff.rincian_manual.length} pekerjaan
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <span className="text-[11px] font-bold text-emerald-800">Total Insentif</span>
                    <div className="text-base font-black text-emerald-800 mt-1">
                      {formatNominal(selectedStaffDetail.staff.total_insentif)}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600">Siap dibayarkan</span>
                  </div>
                </div>

                {/* Daily Breakdown Table */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Rincian Komisi Cuci Harian:</h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Hari & Tanggal</th>
                          <th className="px-3 py-2 text-center">Unit Cuci</th>
                          <th className="px-3 py-2 text-right">Komisi Cuci</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStaffDetail.dailyBreakdown.map((day) => (
                          <tr key={day.tanggal} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <span className="font-bold text-slate-800">{day.dayName}</span>, {formatDate(day.tanggal)}
                            </td>
                            <td className="px-3 py-2 text-center font-medium text-slate-700">
                              {day.units > 0 ? `${day.units} unit` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900">
                              {day.komisiCuci > 0 ? formatNominal(day.komisiCuci) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Manual Jobs List */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">
                    Rincian Komisi Manual (Pekerjaan Tambahan):
                  </h4>
                  {selectedStaffDetail.staff.rincian_manual.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400">
                      Tidak ada komisi manual untuk staff ini pada minggu yang dipilih.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Tanggal</th>
                            <th className="px-3 py-2">Keterangan Pekerjaan</th>
                            <th className="px-3 py-2">Dicatat Oleh</th>
                            <th className="px-3 py-2 text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedStaffDetail.staff.rincian_manual.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-700">{formatDate(m.tanggal)}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">{m.keterangan}</td>
                              <td className="px-3 py-2 text-slate-500">{m.dientry_oleh_nama || 'Admin'}</td>
                              <td className="px-3 py-2 text-right font-bold text-amber-700">
                                {formatNominal(m.nominal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-400">
                  Total Insentif: <strong className="text-emerald-700">{formatNominal(selectedStaffDetail.staff.total_insentif)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStaffDetail(null)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
