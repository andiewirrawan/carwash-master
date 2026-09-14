'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Staff, Attendance, KomisiManual } from '@/types/database';
import { getStaffList, getAttendanceList, getKomisiManual } from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import {
  Banknote,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Award,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function InsentifMingguanPage() {
  const { user } = useAuth();

  // Default to current week (Monday to Sunday)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [komisiManual, setKomisiManual] = useState<KomisiManual[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allStaff, attList, kmList] = await Promise.all([
        getStaffList(),
        getAttendanceList(startDate, endDate),
        getKomisiManual(),
      ]);
      const filteredKm = kmList.filter(
        (km) => (!startDate || km.tanggal >= startDate) && (!endDate || km.tanggal <= endDate)
      );
      setStaffList(allStaff);
      setAttendances(attList);
      setKomisiManual(filteredKm);
    } catch (err) {
      console.error('Failed loading weekly incentive data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate weekly incentives
  const incentiveData = staffList.map((st) => {
    const staffAtts = attendances.filter((a) => a.staff_id === st.id && a.status === 'Hadir');
    const staffManual = komisiManual.filter((km) => km.staff_id === st.id);
    const totalManual = staffManual.reduce((sum, km) => sum + (km.nominal || 0), 0);
    const multiplier = st.latest_multiplier || 0;

    return {
      staff: st,
      hariHadir: staffAtts.length,
      multiplier,
      totalManual,
    };
  });

  const filteredData = incentiveData.filter(
    (d) =>
      d.staff.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.staff.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div id="insentif-mingguan-page" className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 id="insentif-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
              Insentif Mingguan Staff
            </h1>
            <p className="text-sm text-slate-500">
              Kalkulasi kehadiran, komisi manual, dan pengali multiplier performa staff
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-semibold text-slate-700 focus:outline-none"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 transition"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">
                Rincian Insentif ({formatDateID(startDate)} - {formatDateID(endDate)})
              </h3>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
                <p className="text-xs text-slate-500">Menghitung insentif mingguan...</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Tidak ada data staff untuk ditampilkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Nama Staff</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5 text-center">Hari Hadir</th>
                    <th className="px-4 py-3.5 text-center">Multiplier</th>
                    <th className="px-6 py-3.5 text-right">Bonus / Penyesuaian Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map(({ staff, hariHadir, multiplier, totalManual }) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {staff.nama}
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-600">
                        {staff.role}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600">
                        {hariHadir} hari
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                          +{multiplier}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800">
                        {totalManual > 0 ? formatRupiah(totalManual) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
