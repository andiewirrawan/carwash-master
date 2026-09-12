'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, Attendance, AttendanceStatus } from '@/types/database';
import { getStaffList, getMonthlyAttendance, saveSingleAttendance } from '@/lib/db';
import { formatMonthYear, formatDate, getIndonesianDayName, toInputDate } from '@/lib/format';
import * as XLSX from 'xlsx';
import {
  CalendarDays,
  Calendar,
  Users,
  Search,
  Download,
  CheckCircle2,
  Clock,
  HeartPulse,
  XCircle,
  FileSpreadsheet,
  Filter,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  Save,
} from 'lucide-react';

export default function RekapAbsensiPage() {
  const { user } = useAuth();
  const isAuthorized = user && ['admin', 'spv', 'owner', 'sistem_owner'].includes(user.role);

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09'); // YYYY-MM
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);

  // Quick edit modal state for clicking a day cell
  const [quickEditModal, setQuickEditModal] = useState<{
    staffId: number;
    staffNama: string;
    dateStr: string;
    currentStatus: AttendanceStatus | null;
  } | null>(null);
  const [modalSaving, setModalSaving] = useState<boolean>(false);

  // Calculate days in the selected month
  const daysInMonth = useMemo(() => {
    const [yyyy, mm] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(yyyy, mm, 0).getDate();
    const days: { dayNumber: number; dateStr: string; dayName: string; isWeekend: boolean }[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${selectedMonth}-${dayStr}`;
      const dateObj = new Date(yyyy, mm - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayName = getIndonesianDayName(dateObj).substring(0, 3);

      days.push({
        dayNumber: d,
        dateStr,
        dayName,
        isWeekend,
      });
    }

    return days;
  }, [selectedMonth]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allStaff, monthlyAttendance] = await Promise.all([
        getStaffList(),
        getMonthlyAttendance(selectedMonth),
      ]);

      setStaffList(allStaff.filter((s) => s.aktif));
      setAttendanceRecords(monthlyAttendance);
    } catch (err) {
      console.error('Error loading monthly attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick Month Navigation
  const changeMonth = (diff: number) => {
    const [yyyy, mm] = selectedMonth.split('-').map(Number);
    const newDate = new Date(yyyy, mm - 1 + diff, 1);
    const newY = newDate.getFullYear();
    const newM = String(newDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  // Build matrix lookup: staffId -> dateStr -> status
  const attendanceMatrix = useMemo(() => {
    const matrix: Record<number, Record<string, AttendanceStatus>> = {};
    for (const att of attendanceRecords) {
      if (!matrix[att.staff_id]) {
        matrix[att.staff_id] = {};
      }
      matrix[att.staff_id][att.tanggal] = att.status;
    }
    return matrix;
  }, [attendanceRecords]);

  // Filter staff list
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

  // Per staff totals
  const staffSummaries = useMemo(() => {
    const summaries: Record<
      number,
      { hadir: number; izin: number; sakit: number; alpha: number; totalFilled: number; pct: number }
    > = {};

    for (const staff of staffList) {
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alpha = 0;

      const staffRecords = attendanceMatrix[staff.id] || {};
      for (const day of daysInMonth) {
        const st = staffRecords[day.dateStr];
        if (st === 'Hadir') hadir++;
        else if (st === 'Izin') izin++;
        else if (st === 'Sakit') sakit++;
        else if (st === 'Alpha') alpha++;
      }

      const totalFilled = hadir + izin + sakit + alpha;
      const pct = totalFilled > 0 ? Math.round((hadir / totalFilled) * 100) : 0;

      summaries[staff.id] = { hadir, izin, sakit, alpha, totalFilled, pct };
    }

    return summaries;
  }, [staffList, attendanceMatrix, daysInMonth]);

  // Overall KPI calculation
  const overallKPI = useMemo(() => {
    let totalHadir = 0;
    let totalIzin = 0;
    let totalSakit = 0;
    let totalAlpha = 0;

    for (const staff of staffList) {
      const sum = staffSummaries[staff.id];
      if (sum) {
        totalHadir += sum.hadir;
        totalIzin += sum.izin;
        totalSakit += sum.sakit;
        totalAlpha += sum.alpha;
      }
    }

    const totalFilled = totalHadir + totalIzin + totalSakit + totalAlpha;
    const avgPct = totalFilled > 0 ? Math.round((totalHadir / totalFilled) * 100) : 0;

    return {
      totalStaff: staffList.length,
      totalHadir,
      totalIzin,
      totalSakit,
      totalAlpha,
      avgPct,
    };
  }, [staffList, staffSummaries]);

  // Handle Quick Edit save
  const handleSaveQuickEdit = async (newStatus: AttendanceStatus) => {
    if (!quickEditModal) return;
    setModalSaving(true);
    try {
      await saveSingleAttendance(quickEditModal.staffId, quickEditModal.dateStr, newStatus);
      setQuickEditModal(null);
      await loadData();
    } catch (err) {
      console.error('Error quick saving attendance:', err);
    } finally {
      setModalSaving(false);
    }
  };

  // Export matrix to Excel
  const handleExportExcel = () => {
    setExporting(true);
    try {
      const rows: any[] = [];

      for (let idx = 0; idx < staffList.length; idx++) {
        const staff = staffList[idx];
        const sum = staffSummaries[staff.id] || { hadir: 0, izin: 0, sakit: 0, alpha: 0, pct: 0 };
        const staffRecords = attendanceMatrix[staff.id] || {};

        const row: Record<string, any> = {
          No: idx + 1,
          'Nama Staff': staff.nama,
          Peran: staff.role.toUpperCase(),
        };

        // Days
        for (const day of daysInMonth) {
          const st = staffRecords[day.dateStr];
          const shortCode = st ? st[0] : '-';
          row[`Tgl ${day.dayNumber}`] = shortCode;
        }

        // Totals
        row['Total Hadir (H)'] = sum.hadir;
        row['Total Izin (I)'] = sum.izin;
        row['Total Sakit (S)'] = sum.sakit;
        row['Total Alpha (A)'] = sum.alpha;
        row['% Kehadiran'] = `${sum.pct}%`;

        rows.push(row);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      const colWidths = [
        { wch: 5 },
        { wch: 20 },
        { wch: 12 },
        ...daysInMonth.map(() => ({ wch: 6 })),
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, `Rekap Absensi ${selectedMonth}`);
      XLSX.writeFile(wb, `BSA_Carwash_Rekap_Absensi_${selectedMonth}.xlsx`);
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
          <CalendarDays className="mx-auto h-12 w-12 text-red-500 mb-2" />
          <h2 className="text-lg font-bold">Akses Terbatas</h2>
          <p className="text-sm mt-1">Halaman rekap absensi bulanan hanya dapat diakses oleh Admin, SPV, dan Owner.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div id="rekap-absensi-page" className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A2A5E] text-white shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Rekap Absensi Bulanan
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Matriks kehadiran staff operasional per hari (staff x tanggal) dan rekapitulasi performa
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              id="btn-link-absensi-harian"
              href="/absensi"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <UserCheck className="h-4 w-4 text-[#0A2A5E]" />
              Input Absensi Harian
            </Link>
            <button
              id="btn-export-excel-rekap"
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Mengekspor...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div id="month-control-bar" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Periode Bulan:
            </span>
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 p-1">
              <button
                id="btn-prev-month"
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                id="input-bulan-absensi"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none"
              />
              <button
                id="btn-next-month"
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="ml-2 text-sm font-bold text-slate-800">
              {formatMonthYear(`${selectedMonth}-01`)}
            </span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Keterangan:</span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" /> H = Hadir
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> I = Izin
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
              <span className="h-2 w-2 rounded-full bg-indigo-600" /> S = Sakit
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
              <span className="h-2 w-2 rounded-full bg-rose-600" /> A = Alpha
            </span>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div id="rekap-kpi-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div id="rekap-kpi-total-staff" className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Staff</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{overallKPI.totalStaff}</span>
              <span className="text-xs text-slate-400">orang</span>
            </div>
          </div>

          <div id="rekap-kpi-hadir-rate" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Kehadiran Tim</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">{overallKPI.avgPct}%</span>
              <span className="text-xs font-semibold text-emerald-600">rata-rata</span>
            </div>
          </div>

          <div id="rekap-kpi-total-hadir" className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">Total Hari Hadir</span>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700">{overallKPI.totalHadir}</span>
              <span className="text-xs text-blue-600">hari staff</span>
            </div>
          </div>

          <div id="rekap-kpi-izin-sakit" className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Izin / Sakit</span>
              <HeartPulse className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700">
                {overallKPI.totalIzin + overallKPI.totalSakit}
              </span>
              <span className="text-xs text-amber-600">hari</span>
            </div>
          </div>

          <div id="rekap-kpi-total-alpha" className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">Total Alpha</span>
              <XCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">{overallKPI.totalAlpha}</span>
              <span className="text-xs text-rose-600">hari</span>
            </div>
          </div>
        </div>

        {/* Filter and Search */}
        <div id="filter-controls-row" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Peran:</span>
            {['all', 'washer', 'checker', 'leader'].map((role) => (
              <button
                key={role}
                id={`btn-filter-rekap-role-${role}`}
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
              id="input-search-staff-rekap"
              type="text"
              placeholder="Cari staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0A2A5E] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Staff x Dates Matrix Table */}
        <div id="matrix-table-container" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0A2A5E] border-t-transparent" />
              <p className="mt-3 text-xs font-medium">Memuat rekap absensi...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada data staff</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter atau pencarian Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="table-rekap-matrix" className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-700">
                    {/* Fixed Info Columns */}
                    <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2.5 shadow-sm border-r border-slate-200 w-10 text-center">
                      No
                    </th>
                    <th className="sticky left-10 z-20 bg-slate-50 px-3 py-2.5 shadow-sm border-r border-slate-200 min-w-[150px]">
                      Nama Staff
                    </th>
                    <th className="sticky left-[190px] z-20 bg-slate-50 px-3 py-2.5 shadow-sm border-r border-slate-200 min-w-[90px]">
                      Peran
                    </th>

                    {/* Dynamic Days in Month */}
                    {daysInMonth.map((day) => (
                      <th
                        key={day.dayNumber}
                        className={`px-1.5 py-2 text-center border-r border-slate-100 min-w-[34px] ${
                          day.isWeekend ? 'bg-amber-50/60 text-amber-900 font-black' : ''
                        }`}
                        title={`${day.dayName}, ${day.dateStr}`}
                      >
                        <div className="text-[10px] uppercase text-slate-400">{day.dayName}</div>
                        <div className="text-xs font-bold text-slate-800">{day.dayNumber}</div>
                      </th>
                    ))}

                    {/* Summary Columns */}
                    <th className="px-3 py-2.5 text-center bg-emerald-50 text-emerald-900 border-l border-r border-emerald-200 font-bold min-w-[45px]">
                      H
                    </th>
                    <th className="px-3 py-2.5 text-center bg-amber-50 text-amber-900 border-r border-amber-200 font-bold min-w-[45px]">
                      I
                    </th>
                    <th className="px-3 py-2.5 text-center bg-indigo-50 text-indigo-900 border-r border-indigo-200 font-bold min-w-[45px]">
                      S
                    </th>
                    <th className="px-3 py-2.5 text-center bg-rose-50 text-rose-900 border-r border-rose-200 font-bold min-w-[45px]">
                      A
                    </th>
                    <th className="px-3 py-2.5 text-center bg-slate-100 text-slate-800 font-bold min-w-[65px]">
                      % Hadir
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((staff, idx) => {
                    const sum = staffSummaries[staff.id] || { hadir: 0, izin: 0, sakit: 0, alpha: 0, pct: 0 };
                    const staffRecords = attendanceMatrix[staff.id] || {};

                    return (
                      <tr
                        key={staff.id}
                        id={`row-staff-${staff.id}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Fixed Info */}
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 text-center font-semibold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="sticky left-10 z-10 bg-white px-3 py-2 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {staff.nama}
                        </td>
                        <td className="sticky left-[190px] z-10 bg-white px-3 py-2 border-r border-slate-200">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              staff.role === 'leader'
                                ? 'bg-amber-100 text-amber-800'
                                : staff.role === 'checker'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {staff.role}
                          </span>
                        </td>

                        {/* Day Cells */}
                        {daysInMonth.map((day) => {
                          const status = staffRecords[day.dateStr] || null;

                          let badgeClass = 'text-slate-300 bg-transparent';
                          let label = '-';

                          if (status === 'Hadir') {
                            badgeClass = 'bg-emerald-600 text-white font-black';
                            label = 'H';
                          } else if (status === 'Izin') {
                            badgeClass = 'bg-amber-500 text-white font-black';
                            label = 'I';
                          } else if (status === 'Sakit') {
                            badgeClass = 'bg-indigo-600 text-white font-black';
                            label = 'S';
                          } else if (status === 'Alpha') {
                            badgeClass = 'bg-rose-600 text-white font-black';
                            label = 'A';
                          }

                          return (
                            <td
                              key={day.dayNumber}
                              id={`cell-${staff.id}-${day.dayNumber}`}
                              onClick={() =>
                                setQuickEditModal({
                                  staffId: staff.id,
                                  staffNama: staff.nama,
                                  dateStr: day.dateStr,
                                  currentStatus: status,
                                })
                              }
                              className={`p-1 text-center border-r border-slate-100 cursor-pointer transition hover:bg-blue-50/70 ${
                                day.isWeekend ? 'bg-amber-50/20' : ''
                              }`}
                              title={`${staff.nama} (${day.dateStr}): ${status || 'Belum diisi'} - Klik untuk ubah`}
                            >
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] ${badgeClass}`}
                              >
                                {label}
                              </span>
                            </td>
                          );
                        })}

                        {/* Summary Totals */}
                        <td className="px-2 py-2 text-center font-bold text-emerald-700 bg-emerald-50/40 border-l border-r border-emerald-100">
                          {sum.hadir}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-amber-700 bg-amber-50/40 border-r border-amber-100">
                          {sum.izin}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50/40 border-r border-indigo-100">
                          {sum.sakit}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-rose-100">
                          {sum.alpha}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-slate-800 bg-slate-50">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              sum.pct >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : sum.pct >= 75
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sum.pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Edit Modal (when clicking a cell) */}
        {quickEditModal && (
          <div
            id="quick-edit-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <div
              id="quick-edit-modal"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-150"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ubah Status Absensi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {quickEditModal.staffNama} • {formatDate(quickEditModal.dateStr)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickEditModal(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuickEdit('Hadir')}
                  disabled={modalSaving}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    quickEditModal.currentStatus === 'Hadir'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Hadir
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuickEdit('Izin')}
                  disabled={modalSaving}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    quickEditModal.currentStatus === 'Izin'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  Izin
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuickEdit('Sakit')}
                  disabled={modalSaving}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    quickEditModal.currentStatus === 'Sakit'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <HeartPulse className="h-4 w-4" />
                  Sakit
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuickEdit('Alpha')}
                  disabled={modalSaving}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    quickEditModal.currentStatus === 'Alpha'
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Alpha
                </button>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQuickEditModal(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
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
