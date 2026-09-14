'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Staff, Attendance } from '@/types/database';
import { getStaffList, getAttendanceList } from '@/lib/db';
import {
  CalendarDays,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Award,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function RekapAbsensiPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const [allStaff, monthlyAttendance] = await Promise.all([
        getStaffList(),
        getAttendanceList(startDate, endDate),
      ]);
      setStaffList(allStaff);
      setAttendances(monthlyAttendance);
    } catch (err) {
      console.error('Failed loading rekap absensi:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate stats per staff
  const staffStats = staffList.map((s) => {
    const staffAtts = attendances.filter((a) => a.staff_id === s.id);
    const hadir = staffAtts.filter((a) => a.status === 'Hadir').length;
    const izin = staffAtts.filter((a) => a.status === 'Izin').length;
    const sakit = staffAtts.filter((a) => a.status === 'Sakit').length;
    const alpha = staffAtts.filter((a) => a.status === 'Alpha').length;
    const totalRecorded = hadir + izin + sakit + alpha;
    const persentaseHadir = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 0;

    return {
      staff: s,
      hadir,
      izin,
      sakit,
      alpha,
      totalRecorded,
      persentaseHadir,
    };
  });

  const filteredStats = staffStats.filter(
    (st) =>
      st.staff.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.staff.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div id="rekap-absensi-page" className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 id="rekap-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
              Rekap Bulanan Absensi Staff
            </h1>
            <p className="text-sm text-slate-500">
              Akumulasi presensi dan tingkat kehadiran staff selama periode bulanan
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
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
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-slate-800">
                Laporan Kehadiran Periode {selectedMonth}
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
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                <p className="text-xs text-slate-500">Memuat rekap absensi...</p>
              </div>
            </div>
          ) : filteredStats.length === 0 ? (
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
                    <th className="px-4 py-3.5 text-center">Hadir</th>
                    <th className="px-4 py-3.5 text-center">Izin</th>
                    <th className="px-4 py-3.5 text-center">Sakit</th>
                    <th className="px-4 py-3.5 text-center">Alpha</th>
                    <th className="px-6 py-3.5 text-right">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStats.map(({ staff, hadir, izin, sakit, alpha, persentaseHadir }) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {staff.nama}
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-600">
                        {staff.role}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600">
                        {hadir}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-blue-600">
                        {izin}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-amber-600">
                        {sakit}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-rose-600">
                        {alpha}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                          {persentaseHadir}%
                        </span>
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
