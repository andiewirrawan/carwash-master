'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { getLaporanBulanan, getLaporanHarian } from '@/lib/db';
import { formatNominal, formatDate, formatMonthYear } from '@/lib/format';
import { LaporanBulanan, LaporanHarian } from '@/types/database';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Receipt,
  ArrowUpDown,
  ShieldAlert,
  ChevronRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function LaporanBulananPage() {
  const { isSpv, isOwner, isSistemOwner } = useAuth();
  const isAuthorized = isSpv || isOwner || isSistemOwner;

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [monthlyReports, setMonthlyReports] = useState<LaporanBulanan[]>([]);
  const [allDailyReports, setAllDailyReports] = useState<LaporanHarian[]>([]);
  const [exporting, setExporting] = useState<boolean>(false);

  // Selected Month Detail Modal state
  const [activeMonthDetail, setActiveMonthDetail] = useState<{
    bulanStr: string;
    bulanDisplay: string;
    omzet: number;
    jumlah_transaksi: number;
  } | null>(null);

  useEffect(() => {
    async function fetchReports() {
      if (!isAuthorized) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [bulanan, harian] = await Promise.all([
          getLaporanBulanan(selectedYear),
          getLaporanHarian(),
        ]);

        setMonthlyReports(bulanan);
        setAllDailyReports(harian);
      } catch (err) {
        console.error('Error fetching monthly report:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [selectedYear, isAuthorized]);

  // Annual Totals
  const totalOmzetYear = useMemo(() => {
    return monthlyReports.reduce((sum, m) => sum + m.omzet, 0);
  }, [monthlyReports]);

  const totalTrxYear = useMemo(() => {
    return monthlyReports.reduce((sum, m) => sum + m.jumlah_transaksi, 0);
  }, [monthlyReports]);

  const avgMonthlyOmzet = useMemo(() => {
    if (monthlyReports.length === 0) return 0;
    return Math.round(totalOmzetYear / monthlyReports.length);
  }, [monthlyReports, totalOmzetYear]);

  // Filter daily reports for the opened active month modal
  const dailyDetailsForActiveMonth = useMemo(() => {
    if (!activeMonthDetail) return [];
    // month format YYYY-MM
    const prefix = activeMonthDetail.bulanStr.substring(0, 7);
    return allDailyReports.filter((d) => d.tanggal.startsWith(prefix));
  }, [activeMonthDetail, allDailyReports]);

  // Export to Excel handler using xlsx library
  const handleExportExcel = () => {
    setExporting(true);
    try {
      // 1. Prepare Summary Sheet Data
      const summaryRows = monthlyReports.map((item, idx) => ({
        No: idx + 1,
        'Bulan / Periode': formatMonthYear(item.bulan),
        'Kode Bulan': item.bulan.substring(0, 7),
        'Jumlah Transaksi (Unit)': item.jumlah_transaksi,
        'Total Omzet': item.omzet,
      }));

      // Append Total row
      summaryRows.push({
        No: '' as any,
        'Bulan / Periode': 'TOTAL TAHUN ' + selectedYear,
        'Kode Bulan': '',
        'Jumlah Transaksi (Unit)': totalTrxYear,
        'Total Omzet': totalOmzetYear,
      });

      // 2. Prepare Detailed Daily Sheet Data for the current year
      const yearDailyRows = allDailyReports
        .filter((d) => d.tanggal.startsWith(String(selectedYear)))
        .map((d, idx) => ({
          No: idx + 1,
          Tanggal: formatDate(d.tanggal),
          'Format ISO': d.tanggal,
          'Jumlah Transaksi': d.jumlah_transaksi,
          'Total Omzet': d.omzet,
          'Tunai (Cash)': d.tunai,
          'QRIS (Digital)': d.qris,
          Piutang: d.piutang,
        }));

      // Create Workbook
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsDaily = XLSX.utils.json_to_sheet(yearDailyRows);

      // Set column widths
      wsSummary['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 15 },
        { wch: 24 },
        { wch: 20 },
      ];
      wsDaily['!cols'] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, `Laporan Bulanan ${selectedYear}`);
      XLSX.utils.book_append_sheet(wb, wsDaily, `Rincian Harian ${selectedYear}`);

      // Generate filename and save
      const fileName = `Laporan_Bulanan_Carwash_BSA_${selectedYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting Excel:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Akses Terbatas</h2>
          <p className="mt-2 text-xs text-slate-600">
            Halaman Laporan Bulanan & Export Excel hanya dapat diakses oleh role SPV, Owner, atau
            Sistem Owner.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Laporan Omzet Bulanan
                </h1>
                <p className="text-xs text-slate-500">
                  Agregasi otomatis dari SQL View <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">laporan_bulanan</code> & export Excel (.xlsx)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
              <Calendar className="h-4 w-4 text-slate-400" />
              <label htmlFor="year-select" className="text-xs font-semibold text-slate-600">Tahun:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            {/* Export to Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={exporting || monthlyReports.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Memproses File...' : 'Export Excel (.xlsx)'}
            </button>
          </div>
        </div>

        {/* 3 Summary Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Omzet Tahun {selectedYear}
            </span>
            <p className="mt-2 text-2xl font-extrabold text-[#0A2A5E]">
              {loading ? '...' : formatNominal(totalOmzetYear)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Nominal format standar tanpa &quot;Rp&quot;</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Kendaraan Dicuci
            </span>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {loading ? '...' : totalTrxYear}{' '}
              <span className="text-xs font-normal text-slate-500">transaksi aktif</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Mobil & Motor gabungan</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Omzet / Bulan
            </span>
            <p className="mt-2 text-2xl font-extrabold text-[#F97316]">
              {loading ? '...' : formatNominal(avgMonthlyOmzet)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Dari {monthlyReports.length} bulan tercatat</p>
          </div>
        </div>

        {/* Monthly Report Data Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0A2A5E]" />
                Rekapitulasi Per Bulan (Tahun {selectedYear})
              </h2>
              <p className="text-[11px] text-slate-500">
                Klik baris atau tombol detail untuk melihat rincian transaksi harian pada bulan tersebut.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Format: dd/mm/yyyy
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">No.</th>
                  <th className="px-5 py-3.5">Periode / Bulan</th>
                  <th className="px-5 py-3.5 text-center">Jumlah Transaksi (Unit)</th>
                  <th className="px-5 py-3.5 text-right">Total Omzet</th>
                  <th className="px-5 py-3.5 text-center">Aksi / Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      Memuat laporan bulanan...
                    </td>
                  </tr>
                ) : monthlyReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      Belum ada data transaksi pada tahun {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  monthlyReports.map((item, idx) => (
                    <tr
                      key={item.bulan}
                      onClick={() =>
                        setActiveMonthDetail({
                          bulanStr: item.bulan,
                          bulanDisplay: formatMonthYear(item.bulan),
                          omzet: item.omzet,
                          jumlah_transaksi: item.jumlah_transaksi,
                        })
                      }
                      className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {formatMonthYear(item.bulan)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                          {item.jumlah_transaksi} unit
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-[#0A2A5E] text-sm">
                        {formatNominal(item.omzet)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0A2A5E] hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Detail Harian</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthlyReports.length > 0 && (
                <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="px-5 py-4 text-right uppercase text-[11px]">
                      Total Keseluruhan Tahun {selectedYear}:
                    </td>
                    <td className="px-5 py-4 text-center font-extrabold text-emerald-700">
                      {totalTrxYear} unit
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-[#0A2A5E] text-base">
                      {formatNominal(totalOmzetYear)}
                    </td>
                    <td className="px-5 py-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Modal: Daily Details for Clicked Month */}
        {activeMonthDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
                <div>
                  <h3 className="text-base font-bold">
                    Rincian Harian: {activeMonthDetail.bulanDisplay}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Total: {formatNominal(activeMonthDetail.omzet)} ({activeMonthDetail.jumlah_transaksi} transaksi)
                  </p>
                </div>
                <button
                  onClick={() => setActiveMonthDetail(null)}
                  className="rounded-lg p-1.5 text-blue-200 hover:bg-blue-900 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-6">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-right">Tunai</th>
                      <th className="px-3 py-2 text-right">QRIS</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-900">Total Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyDetailsForActiveMonth.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          Tidak ada rincian harian untuk bulan ini.
                        </td>
                      </tr>
                    ) : (
                      dailyDetailsForActiveMonth.map((day) => (
                        <tr key={day.tanggal} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-semibold text-slate-800">
                            {formatDate(day.tanggal)}
                          </td>
                          <td className="px-3 py-2.5 text-center">{day.jumlah_transaksi}</td>
                          <td className="px-3 py-2.5 text-right">{formatNominal(day.tunai)}</td>
                          <td className="px-3 py-2.5 text-right">{formatNominal(day.qris)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-[#0A2A5E]">
                            {formatNominal(day.omzet)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
                <button
                  onClick={() => setActiveMonthDetail(null)}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
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
