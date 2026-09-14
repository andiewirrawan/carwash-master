'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Staff, Attendance, AttendanceStatus } from '@/types/database';
import { getStaffList, getAttendanceList, addAttendance, updateAttendance } from '@/lib/db';
import { formatDateID } from '@/lib/format';
import {
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function AttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allStaff, dateAttendance] = await Promise.all([
        getStaffList(),
        getAttendanceList(selectedDate, selectedDate),
      ]);
      setStaffList(allStaff);
      setAttendances(dateAttendance);
    } catch (err) {
      console.error('Failed loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (staffId: number, status: AttendanceStatus) => {
    setSavingId(staffId);
    try {
      const existing = attendances.find(
        (a) => a.staff_id === staffId && a.tanggal === selectedDate
      );

      if (existing) {
        await updateAttendance(existing.id, { status });
        setAttendances((prev) =>
          prev.map((a) => (a.id === existing.id ? { ...a, status } : a))
        );
      } else {
        const created = await addAttendance({
          staff_id: staffId,
          tanggal: selectedDate,
          status,
        });
        setAttendances((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error('Failed saving attendance:', err);
    } finally {
      setSavingId(null);
    }
  };

  const attendanceMap = new Map<number, AttendanceStatus>();
  attendances.forEach((a) => {
    if (a.tanggal === selectedDate) {
      attendanceMap.set(a.staff_id, a.status);
    }
  });

  const filteredStaff = staffList.filter((s) =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const countHadir = attendances.filter((a) => a.status === 'Hadir').length;
  const countIzin = attendances.filter((a) => a.status === 'Izin').length;
  const countSakit = attendances.filter((a) => a.status === 'Sakit').length;
  const countAlpha = attendances.filter((a) => a.status === 'Alpha').length;

  return (
    <AdminLayout>
      <div id="attendance-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 id="attendance-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
              Absensi Staff Harian
            </h1>
            <p className="text-sm text-slate-500">
              Catat dan pantau kehadiran seluruh staff washer, checker, dan tim operasional
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Hadir</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800">
                {countHadir}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{countHadir}</p>
            <p className="text-[11px] text-emerald-700">Staff aktif bertugas</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">Izin</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800">
                {countIzin}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{countIzin}</p>
            <p className="text-[11px] text-blue-700">Izin terkonfirmasi</p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Sakit</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                {countSakit}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900">{countSakit}</p>
            <p className="text-[11px] text-amber-700">Keterangan sakit</p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">Alpha</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200 text-xs font-bold text-rose-800">
                {countAlpha}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-900">{countAlpha}</p>
            <p className="text-[11px] text-rose-700">Tanpa keterangan</p>
          </div>
        </div>

        {/* Staff Attendance Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-slate-800">
                Daftar Presensi ({formatDateID(selectedDate)})
              </h3>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama staff..."
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
                <p className="text-xs text-slate-500">Memuat data absensi...</p>
              </div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Tidak ada staff yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Nama Staff</th>
                    <th className="px-4 py-3.5">Peran / Role</th>
                    <th className="px-6 py-3.5 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((staff) => {
                    const currentStatus = attendanceMap.get(staff.id);
                    const isSaving = savingId === staff.id;

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A2A5E] text-white text-xs font-bold">
                              {staff.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{staff.nama}</p>
                              <p className="text-xs text-slate-400">ID #{staff.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {(['Hadir', 'Izin', 'Sakit', 'Alpha'] as AttendanceStatus[]).map((status) => {
                              const isSelected = currentStatus === status;
                              let activeClass = '';

                              if (isSelected) {
                                if (status === 'Hadir') activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                                else if (status === 'Izin') activeClass = 'bg-blue-600 text-white font-bold shadow-xs';
                                else if (status === 'Sakit') activeClass = 'bg-amber-600 text-white font-bold shadow-xs';
                                else if (status === 'Alpha') activeClass = 'bg-rose-600 text-white font-bold shadow-xs';
                              } else {
                                activeClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                              }

                              return (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleStatusChange(staff.id, status)}
                                  className={`rounded-lg px-3 py-1.5 text-xs transition disabled:opacity-50 ${activeClass}`}
                                >
                                  {status}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
