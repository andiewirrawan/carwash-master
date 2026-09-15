'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getKomisiPerStaff, getStaffList } from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import { KomisiPerStaff, Staff } from '@/types/database';
import {
  Calendar,
  Users,
  Search,
  DollarSign,
} from 'lucide-react';

export function InsentifWasherReportContent() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [komisiList, setKomisiList] = useState<KomisiPerStaff[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kData, sData] = await Promise.all([
        getKomisiPerStaff({ startDate: date, endDate: date }),
        getStaffList()
      ]);
      setKomisiList(kData);
      setStaffList(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStaff = staffList.filter(s => 
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalKomisi = komisiList.reduce((acc, k) => acc + (k.total_komisi || 0), 0);

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
        <div className="rounded-xl bg-blue-50 px-4 py-2 border border-blue-100 flex items-center gap-3">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-[10px] font-bold text-blue-700 uppercase">Total Komisi Harian</p>
            <p className="text-sm font-bold text-[#0A2A5E]">{formatRupiah(totalKomisi)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-[#0A2A5E] focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Nama Staff</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4 text-center">Unit Cuci</th>
                <th className="px-5 py-4 text-right">Komisi Diterima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">Tidak ada staff ditemukan.</td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const k = komisiList.find(item => item.id === s.id || item.staff_id === s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">{s.nama}</td>
                      <td className="px-5 py-4 capitalize text-slate-500">{s.role}</td>
                      <td className="px-5 py-4 text-center font-bold text-slate-700">{k?.total_transaksi || 0}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-600">{formatRupiah(k?.total_komisi || 0)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
