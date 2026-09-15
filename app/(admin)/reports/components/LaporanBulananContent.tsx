'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getLaporanBulanan } from '@/lib/db';
import { formatRupiah } from '@/lib/format';
import { LaporanBulanan } from '@/types/database';
import {
  Calendar,
  Download,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export function LaporanBulananContent() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [reports, setReports] = useState<LaporanBulanan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLaporanBulanan(year);
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalYearlyOmzet = reports.reduce((acc, r) => acc + (r.omzet || 0), 0);
  const totalYearlyTrx = reports.reduce((acc, r) => acc + (r.jumlah_transaksi || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Tahun:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold focus:outline-hidden"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#0A2A5E] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition">
          <Download className="h-4 w-4" />
          <span>Laporan Tahunan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span>Total Omzet Tahun {year}</span>
          </div>
          <p className="text-3xl font-bold text-[#0A2A5E]">{formatRupiah(totalYearlyOmzet)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
            <span>Total Transaksi Tahun {year}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalYearlyTrx} Cuci</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Bulan</th>
                <th className="px-6 py-4 text-center">Unit Terlayani</th>
                <th className="px-6 py-4 text-right">Pendapatan Omzet</th>
                <th className="px-6 py-4 text-right">Rata-rata / Hari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">Belum ada data bulanan.</td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.bulan} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{r.bulan}</td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-700">{r.jumlah_transaksi} Unit</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#0A2A5E]">{formatRupiah(r.omzet)}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">{formatRupiah(Math.round(r.omzet / 30))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
