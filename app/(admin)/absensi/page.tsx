'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, AttendanceStatus } from '@/types/database';
import { getStaffList, getAttendanceByDate, saveBulkAttendance } from '@/lib/db';
import { formatDate, getIndonesianDayName, toInputDate } from '@/lib/format';
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartPulse,
  XCircle,
  Save,
  Users,
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

export default function AbsensiHarianPage() {
  const { user } = useAuth();
  // Admin, SPV, Owner, and Sistem Owner can manage attendance
  const isAuthorized = user && ['admin', 'spv', 'owner', 'sistem_owner'].includes(user.role);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Default to today (2026-09-12 in system context, or current date)
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-12');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attendance status mapping: { [staffId]: AttendanceStatus }
  const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Load staff and attendance for selected date
  const loadData = useCallback(async () => {
    setLoading(true);
    setSaveSuccess('');
    setSaveError('');
    try {
      const [allStaff, dateAttendance] = await Promise.all([
        getStaffList(),
        getAttendanceByDate(selectedDate),
      ]);

      const activeStaff = allStaff.filter((s) => s.aktif);
      setStaffList(activeStaff);

      // Map attendance
      const map: Record<number, AttendanceStatus> = {};
      const attMap = new Map<number, AttendanceStatus>();
      for (const att of dateAttendance) {
        attMap.set(att.staff_id, att.status);
      }

      // If already recorded, use it; otherwise default to 'Hadir'
      for (const staff of activeStaff) {
        map[staff.id] = attMap.get(staff.id) || 'Hadir';
      }

      setStatusMap(map);
      setHasChanges(false);
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setSaveError('Gagal memuat data absensi staff.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick Date Navigation
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    setSelectedDate(toInputDate(dateObj));
  };

  const handleStatusChange = (staffId: number, newStatus: AttendanceStatus) => {
    setStatusMap((prev) => ({
      ...prev,
      [staffId]: newStatus,
    }));
    setHasChanges(true);
    setSaveSuccess('');
  };

  // Mark all currently visible or all staff as Hadir
  const handleMarkAllHadir = () => {
    setStatusMap((prev) => {
      const updated = { ...prev };
      for (const staff of staffList) {
        updated[staff.id] = 'Hadir';
      }
      return updated;
    });
    setHasChanges(true);
    setSaveSuccess('Seluruh staff ditandai "Hadir". Jangan lupa klik "Simpan Absensi".');
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const itemsToSave = staffList.map((staff) => ({
        staff_id: staff.id,
        status: statusMap[staff.id] || 'Hadir',
      }));

      await saveBulkAttendance(selectedDate, itemsToSave);
      setHasChanges(false);
      setSaveSuccess(`Data absensi tanggal ${formatDate(selectedDate)} berhasil disimpan.`);
      // Refresh
      await loadData();
    } catch (err) {
      console.error('Error saving attendance:', err);
      setSaveError('Terjadi kesalahan saat menyimpan absensi.');
    } finally {
      setSaving(false);
    }
  };

  // Summary counts
  const summary = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    for (const staff of staffList) {
      const st = statusMap[staff.id];
      if (st === 'Hadir') hadir++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else if (st === 'Alpha') alpha++;
    }

    const total = staffList.length;
    const hadirPct = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, izin, sakit, alpha, hadirPct };
  }, [staffList, statusMap]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchRole = roleFilter === 'all' || staff.role === roleFilter;
      const matchSearch =
        searchQuery === '' ||
        staff.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [staffList, roleFilter, searchQuery]);

  const dayName = getIndonesianDayName(selectedDate);

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div id="unauthorized-card" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <ShieldCheck className="mx-auto h-12 w-12 text-red-500 mb-2" />
          <h2 className="text-lg font-bold">Akses Terbatas</h2>
          <p className="text-sm mt-1">Halaman absensi harian hanya dapat diakses oleh Admin, SPV, dan Owner.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div id="absensi-harian-page" className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A2A5E] text-white shadow-sm">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Absensi Harian Staff
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Pencatatan kehadiran operasional car wash berdasarkan laporan leader di lapangan
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              id="btn-link-rekap-absensi"
              href="/rekap-absensi"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <CalendarDays className="h-4 w-4 text-slate-500" />
              Rekap Bulanan
            </Link>
            <Link
              id="btn-link-insentif-mingguan"
              href="/insentif-mingguan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Insentif Mingguan
            </Link>
            <button
              id="btn-save-attendance-top"
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow transition ${
                hasChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
                  : 'bg-[#0A2A5E] hover:bg-[#071f45]'
              } disabled:opacity-50`}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          </div>
        </div>

        {/* Informational banner: Leader accountability */}
        <div id="leader-info-banner" className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-blue-900">
          <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="text-xs leading-relaxed text-blue-800">
            <span className="font-bold text-blue-900">Catatan Operasional:</span> Leader di lapangan bertindak sebagai staff operasional dan tidak memiliki akun login ke aplikasi kasir. Admin bertugas mencatat dan memverifikasi presensi kehadiran seluruh staff (Washer, Checker, dan Leader) setiap hari berdasarkan laporan fisik maupun laporan grup koordinasi lapangan.
          </div>
        </div>

        {/* Date Selector & Navigation Bar */}
        <div id="date-navigation-card" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pilih Tanggal:
            </span>
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 p-1">
              <button
                id="btn-prev-day"
                type="button"
                onClick={() => changeDateByDays(-1)}
                className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                id="input-tanggal-absensi"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none"
              />
              <button
                id="btn-next-day"
                type="button"
                onClick={() => changeDateByDays(1)}
                className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="Hari Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              id="btn-today-shortcut"
              type="button"
              onClick={() => setSelectedDate('2026-09-12')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Hari Ini
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Calendar className="h-4 w-4 text-[#0A2A5E]" />
              <span>{dayName ? `${dayName}, ` : ''}{formatDate(selectedDate)}</span>
            </div>

            <button
              id="btn-mark-all-hadir"
              type="button"
              onClick={handleMarkAllHadir}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Tandai Semua Hadir
            </button>
          </div>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <div id="alert-save-success" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{saveSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccess('')}
              className="text-emerald-700 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}

        {saveError && (
          <div id="alert-save-error" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>{saveError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveError('')}
              className="text-rose-700 hover:text-rose-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary KPI Cards */}
        <div id="absensi-kpi-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div id="kpi-card-total-staff" className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Staff Aktif</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{summary.total}</span>
              <span className="text-xs text-slate-400">orang</span>
            </div>
          </div>

          <div id="kpi-card-hadir" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Hadir</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">{summary.hadir}</span>
              <span className="text-xs font-bold text-emerald-600">({summary.hadirPct}%)</span>
            </div>
          </div>

          <div id="kpi-card-izin" className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Izin</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700">{summary.izin}</span>
              <span className="text-xs text-amber-600">orang</span>
            </div>
          </div>

          <div id="kpi-card-sakit" className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-800">Sakit</span>
              <HeartPulse className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700">{summary.sakit}</span>
              <span className="text-xs text-indigo-600">orang</span>
            </div>
          </div>

          <div id="kpi-card-alpha" className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">Alpha</span>
              <XCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">{summary.alpha}</span>
              <span className="text-xs text-rose-600">orang</span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div id="staff-filter-bar" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
                {role === 'all' ? 'Semua Staff' : role}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              id="input-search-staff-absensi"
              type="text"
              placeholder="Cari nama staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0A2A5E] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Staff Attendance Input Cards */}
        <div id="staff-attendance-list" className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0A2A5E] border-t-transparent" />
              <p className="mt-3 text-xs font-medium">Memuat daftar staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada staff ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter peran.</p>
            </div>
          ) : (
            filteredStaff.map((staff, index) => {
              const currentStatus = statusMap[staff.id] || 'Hadir';

              return (
                <div
                  key={staff.id}
                  id={`staff-attendance-row-${staff.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 md:flex-row md:items-center md:justify-between"
                >
                  {/* Staff Info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{staff.nama}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            staff.role === 'leader'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : staff.role === 'checker'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {staff.role}
                        </span>
                        {staff.latest_multiplier !== undefined && staff.latest_multiplier > 0 && (
                          <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                            +{staff.latest_multiplier}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">ID: #{staff.id}</span>
                    </div>
                  </div>

                  {/* Status Selection Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Hadir */}
                    <button
                      id={`btn-status-${staff.id}-hadir`}
                      type="button"
                      onClick={() => handleStatusChange(staff.id, 'Hadir')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                        currentStatus === 'Hadir'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-1'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Hadir
                    </button>

                    {/* Izin */}
                    <button
                      id={`btn-status-${staff.id}-izin`}
                      type="button"
                      onClick={() => handleStatusChange(staff.id, 'Izin')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                        currentStatus === 'Izin'
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500 ring-offset-1'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Izin
                    </button>

                    {/* Sakit */}
                    <button
                      id={`btn-status-${staff.id}-sakit`}
                      type="button"
                      onClick={() => handleStatusChange(staff.id, 'Sakit')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                        currentStatus === 'Sakit'
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600 ring-offset-1'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    >
                      <HeartPulse className="h-3.5 w-3.5" />
                      Sakit
                    </button>

                    {/* Alpha */}
                    <button
                      id={`btn-status-${staff.id}-alpha`}
                      type="button"
                      onClick={() => handleStatusChange(staff.id, 'Alpha')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                        currentStatus === 'Alpha'
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600 ring-offset-1'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Alpha
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Save Floating Action Bar */}
        <div id="bottom-save-bar" className="sticky bottom-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between">
          <div className="mb-2 sm:mb-0">
            <span className="text-xs font-semibold text-slate-600">
              {hasChanges ? (
                <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                  <AlertCircle className="h-4 w-4" />
                  Ada perubahan yang belum disimpan untuk tanggal {formatDate(selectedDate)}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Semua perubahan tersimpan
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-reset-changes"
              type="button"
              onClick={loadData}
              disabled={loading || saving}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Reset
            </button>
            <button
              id="btn-save-attendance-bottom"
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A2A5E] px-5 py-2 text-xs font-bold text-white shadow hover:bg-[#071f45] transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : `Simpan Absensi ${formatDate(selectedDate)}`}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
