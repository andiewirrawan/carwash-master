'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getLaporanHarianRange } from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import { LaporanHarian } from '@/types/database';
import {
  Calendar,
  Search,
  Download,
  BarChart3,
  TrendingUp,
  Receipt,
  Wallet,
} from 'lucide-react';

export function LaporanHarianContent() {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reports, setReports] = useState<LaporanHarian[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLaporanHarianRange(startDate, endDate);
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalOmzet = reports.reduce((acc, r) => acc + (r.omzet || 0), 0);
  const totalTrx = reports.reduce((acc, r) => acc + (r.jumlah_transaksi || 0), 0);
  const totalTunai = reports.reduce((acc, r) => acc + (r.metode_tunai || 0), 0);
  const totalNonTunai = reports.reduce((acc, r) => acc + (r.metode_qris || 0) + (r.metode_transfer || 0), 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-hidden"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-hidden"
            />
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#0A2A5E] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition shadow-sm">
          <Download className="h-4 w-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Omzet</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatRupiah(totalOmzet)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Jumlah Cuci</span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalTrx} Unit</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Tunai</span>
            <Wallet className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatRupiah(totalTunai)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Non-Tunai</span>
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatRupiah(totalNonTunai)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4 text-center">Unit</th>
                <th className="px-5 py-4 text-right">Tunai</th>
                <th className="px-5 py-4 text-right">Non-Tunai</th>
                <th className="px-5 py-4 text-right">Total Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">Tidak ada data laporan.</td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id || r.tanggal} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-semibold text-slate-900">{formatDateID(r.tanggal)}</td>
                    <td className="px-5 py-4 text-center font-bold">{r.jumlah_transaksi}</td>
                    <td className="px-5 py-4 text-right font-mono text-slate-600">{formatRupiah(r.metode_tunai)}</td>
                    <td className="px-5 py-4 text-right font-mono text-slate-600">
                      {formatRupiah((r.metode_qris || 0) + (r.metode_transfer || 0))}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-[#0A2A5E]">{formatRupiah(r.omzet)}</td>
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
