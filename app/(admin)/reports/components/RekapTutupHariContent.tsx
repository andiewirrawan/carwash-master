'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getDailyClosingList } from '@/lib/db';
import { DailyClosing } from '@/types/database';
import { formatRupiah, formatDateID } from '@/lib/format';
import {
  Lock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export function RekapTutupHariContent() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDailyClosingList(date);
      setClosings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Pilih Tanggal:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Waktu Closing</th>
                <th className="px-5 py-4">Kasir / Admin</th>
                <th className="px-5 py-4 text-right">Omzet Tunai</th>
                <th className="px-5 py-4 text-right">Omzet Non-Tunai</th>
                <th className="px-5 py-4 text-right">Grand Total</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : closings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">Belum ada closing pada tanggal ini.</td>
                </tr>
              ) : (
                closings.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {c.waktu_closing?.split('T')[1]?.substring(0, 5) || '-'}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">{c.kasir_nama}</td>
                    <td className="px-5 py-4 text-right font-mono text-slate-600">{formatRupiah(c.omzet_tunai)}</td>
                    <td className="px-5 py-4 text-right font-mono text-slate-600">{formatRupiah(c.omzet_non_tunai)}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-[#0A2A5E]">{formatRupiah(c.omzet_total)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        CLOSED
                      </span>
                    </td>
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
