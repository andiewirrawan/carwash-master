'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, Attendance, AttendanceStatus } from '@/types/database';
import { getStaffList, getAttendanceList, addAttendance, updateAttendance } from '@/lib/db';
import { formatDateID } from '@/lib/format';
import {
  UserCheck,
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Check,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Award,
  Info,
} from 'lucide-react';

type AbsensiCategory = 'absensi_harian' | 'rekap_absensi';
type RekapTab = 'mingguan' | 'bulanan';

export default function AbsensiStaffMainPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat Absensi Staff...</div>}>
        <AbsensiContent />
      </Suspense>
    </AdminLayout>
  );
}

function AbsensiContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Active Category: 'absensi_harian' | 'rekap_absensi'
  const [activeCategory, setActiveCategory] = useState<AbsensiCategory>(() => {
    const cat = searchParams.get('category');
    if (cat === 'rekap_absensi') return 'rekap_absensi';
    return 'absensi_harian';
  });

  // Rekap Absensi Horizontal Tab: 'mingguan' | 'bulanan'
  const [rekapTab, setRekapTab] = useState<RekapTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'mingguan') return 'mingguan';
    return 'bulanan';
  });

  // -------------------------------------------------------------
  // 1. ABSENSI HARIAN STATES
  // -------------------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dailyAttendances, setDailyAttendances] = useState<Attendance[]>([]);
  const [dailyLoading, setDailyLoading] = useState<boolean>(true);
  const [dailySearch, setDailySearch] = useState<string>('');
  const [savingStaffId, setSavingStaffId] = useState<number | null>(null);

  // -------------------------------------------------------------
  // 2. REKAP ABSENSI MINGGUAN & BULANAN STATES
  // -------------------------------------------------------------
  // Mingguan
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [weeklyEndDate, setWeeklyEndDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });
  const [weeklyAttendances, setWeeklyAttendances] = useState<Attendance[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState<boolean>(false);

  // Bulanan
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [monthlyAttendances, setMonthlyAttendances] = useState<Attendance[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);
  const [rekapSearch, setRekapSearch] = useState<string>('');

  // Load Staff List once
  useEffect(() => {
    getStaffList()
      .then((res) => setStaffList(res.filter((s) => s.aktif)))
      .catch(console.error);
  }, []);

  // Load Daily Attendance
  const loadDailyData = useCallback(async () => {
    setDailyLoading(true);
    try {
      const atts = await getAttendanceList(selectedDate, selectedDate);
      setDailyAttendances(atts);
    } catch (err) {
      console.error('Failed loading daily attendance:', err);
    } finally {
      setDailyLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (activeCategory === 'absensi_harian') {
      loadDailyData();
    }
  }, [activeCategory, loadDailyData]);

  // Load Weekly Rekap
  const loadWeeklyData = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const atts = await getAttendanceList(weeklyStartDate, weeklyEndDate);
      setWeeklyAttendances(atts);
    } catch (err) {
      console.error('Failed loading weekly attendance:', err);
    } finally {
      setWeeklyLoading(false);
    }
  }, [weeklyStartDate, weeklyEndDate]);

  useEffect(() => {
    if (activeCategory === 'rekap_absensi' && rekapTab === 'mingguan') {
      loadWeeklyData();
    }
  }, [activeCategory, rekapTab, loadWeeklyData]);

  // Load Monthly Rekap
  const loadMonthlyData = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      const start = `${year}-${month}-01`;
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      const atts = await getAttendanceList(start, end);
      setMonthlyAttendances(atts);
    } catch (err) {
      console.error('Failed loading monthly attendance:', err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (activeCategory === 'rekap_absensi' && rekapTab === 'bulanan') {
      loadMonthlyData();
    }
  }, [activeCategory, rekapTab, loadMonthlyData]);

  // Handle Quick Attendance Change
  const handleStatusChange = async (staffId: number, status: AttendanceStatus) => {
    setSavingStaffId(staffId);
    try {
      const existing = dailyAttendances.find(
        (a) => a.staff_id === staffId && a.tanggal === selectedDate
      );
      if (existing) {
        await updateAttendance(existing.id, { status });
        setDailyAttendances((prev) =>
          prev.map((a) => (a.id === existing.id ? { ...a, status } : a))
        );
      } else {
        const created = await addAttendance({
          staff_id: staffId,
          tanggal: selectedDate,
          status,
        });
        setDailyAttendances((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error('Failed saving status:', err);
    } finally {
      setSavingStaffId(null);
    }
  };

  // Map of daily attendance by staff_id
  const dailyStatusMap = useMemo(() => {
    const map = new Map<number, AttendanceStatus>();
    dailyAttendances.forEach((a) => {
      if (a.tanggal === selectedDate) {
        map.set(a.staff_id, a.status);
      }
    });
    return map;
  }, [dailyAttendances, selectedDate]);

  // KPI Calculations Daily
  const countHadir = dailyAttendances.filter((a) => a.status === 'Hadir').length;
  const countIzin = dailyAttendances.filter((a) => a.status === 'Izin').length;
  const countSakit = dailyAttendances.filter((a) => a.status === 'Sakit').length;
  const countAlpha = dailyAttendances.filter((a) => a.status === 'Alpha').length;

  // Filtered staff for daily
  const filteredDailyStaff = staffList.filter((s) => {
    if (!dailySearch) return true;
    const q = dailySearch.toLowerCase();
    return s.nama.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
  });

  // Calculate stats for weekly rekap
  const weeklyStats = useMemo(() => {
    return staffList.map((st) => {
      const staffAtts = weeklyAttendances.filter((a) => a.staff_id === st.id);
      const hadir = staffAtts.filter((a) => a.status === 'Hadir').length;
      const izin = staffAtts.filter((a) => a.status === 'Izin').length;
      const sakit = staffAtts.filter((a) => a.status === 'Sakit').length;
      const alpha = staffAtts.filter((a) => a.status === 'Alpha').length;
      const total = hadir + izin + sakit + alpha;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
      return { staff: st, hadir, izin, sakit, alpha, total, rate };
    });
  }, [staffList, weeklyAttendances]);

  // Calculate stats for monthly rekap
  const monthlyStats = useMemo(() => {
    return staffList.map((st) => {
      const staffAtts = monthlyAttendances.filter((a) => a.staff_id === st.id);
      const hadir = staffAtts.filter((a) => a.status === 'Hadir').length;
      const izin = staffAtts.filter((a) => a.status === 'Izin').length;
      const sakit = staffAtts.filter((a) => a.status === 'Sakit').length;
      const alpha = staffAtts.filter((a) => a.status === 'Alpha').length;
      const total = hadir + izin + sakit + alpha;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
      return { staff: st, hadir, izin, sakit, alpha, total, rate };
    });
  }, [staffList, monthlyAttendances]);

  return (
    <div id="absensi-staff-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              📅 Absensi Staff
            </h1>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
              Presensi &amp; Rekap
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pencatatan presensi harian staff cuci dan rekap kehadiran mingguan &amp; bulanan.
          </p>
        </div>
      </div>

      {/* Main Container: 2-Column Grid with Vertical Categories on Left */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ========================================================= */}
        {/* VERTICAL CATEGORY SELECTOR (Col 1-4)                      */}
        {/* ========================================================= */}
        <aside className="lg:col-span-3 space-y-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kategori Absensi
            </p>
            <nav className="space-y-1">
              {/* 1. Absensi Harian */}
              <button
                id="cat-btn-absensi-harian"
                onClick={() => setActiveCategory('absensi_harian')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === 'absensi_harian'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📝</span>
                  <div>
                    <p className="leading-tight">Absensi Harian</p>
                    <p
                      className={`text-[11px] font-normal ${
                        activeCategory === 'absensi_harian' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Input kehadiran staff
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    activeCategory === 'absensi_harian' ? 'text-white' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* 2. Rekap Absensi */}
              <button
                id="cat-btn-rekap-absensi"
                onClick={() => setActiveCategory('rekap_absensi')}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === 'rekap_absensi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="leading-tight">Rekap Absensi</p>
                    <p
                      className={`text-[11px] font-normal ${
                        activeCategory === 'rekap_absensi' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Mingguan &amp; Bulanan
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    activeCategory === 'rekap_absensi' ? 'text-white' : 'text-slate-400'
                  }`}
                />
              </button>
            </nav>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Info className="h-4 w-4 text-blue-600" />
              <span>Petunjuk Presensi</span>
            </div>
            <p className="mt-1.5 leading-relaxed text-slate-500">
              Pilih status kehadiran staff untuk langsung menyimpannya. Data kehadiran tersinkronisasi otomatis dengan multiplier insentif mingguan.
            </p>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT AREA (Col 4-12)                              */}
        {/* ========================================================= */}
        <main className="lg:col-span-9 space-y-6">
          {/* ------------------------------------------------------- */}
          {/* 1. KATEGORI: ABSENSI HARIAN (Halaman Tunggal)           */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'absensi_harian' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>📝</span> Absensi Harian Staff
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pencatatan status presensi harian per individu staff
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Pilih Tanggal:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>

              {/* Daily KPI Badges */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Hadir
                  </span>
                  <p className="mt-1 font-mono text-2xl font-bold text-emerald-900">{countHadir}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Izin
                  </span>
                  <p className="mt-1 font-mono text-2xl font-bold text-amber-900">{countIzin}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Sakit
                  </span>
                  <p className="mt-1 font-mono text-2xl font-bold text-blue-900">{countSakit}</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Alpha
                  </span>
                  <p className="mt-1 font-mono text-2xl font-bold text-rose-900">{countAlpha}</p>
                </div>
              </div>

              {/* Staff Attendance Input List */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                  <h3 className="text-sm font-bold text-slate-800">
                    Daftar Staff ({filteredDailyStaff.length}) - {formatDateID(selectedDate)}
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari staff..."
                      value={dailySearch}
                      onChange={(e) => setDailySearch(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredDailyStaff.map((staff) => {
                    const currentStatus = dailyStatusMap.get(staff.id);
                    const isSaving = savingStaffId === staff.id;

                    return (
                      <div
                        key={staff.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm">
                            {staff.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{staff.nama}</p>
                            <p className="text-xs text-slate-500 capitalize">{staff.role}</p>
                          </div>
                        </div>

                        {/* Status Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          {(['Hadir', 'Izin', 'Sakit', 'Alpha'] as AttendanceStatus[]).map((st) => {
                            const isSelected = currentStatus === st;
                            let activeClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                            if (isSelected) {
                              if (st === 'Hadir') activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                              else if (st === 'Izin') activeClass = 'bg-amber-600 text-white font-bold shadow-xs';
                              else if (st === 'Sakit') activeClass = 'bg-blue-600 text-white font-bold shadow-xs';
                              else if (st === 'Alpha') activeClass = 'bg-rose-600 text-white font-bold shadow-xs';
                            }

                            return (
                              <button
                                key={st}
                                disabled={isSaving}
                                onClick={() => handleStatusChange(staff.id, st)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeClass}`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* 2. KATEGORI: REKAP ABSENSI                              */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'rekap_absensi' && (
            <div className="space-y-6">
              {/* Category Header & Horizontal Tabs */}
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>📊</span> Rekap Absensi Staff
                  </h2>
                  <p className="text-xs text-slate-500">
                    Akumulasi presensi dan tingkat persentase kehadiran staff
                  </p>
                </div>

                {/* HORIZONTAL TABS: [Mingguan] [Bulanan] */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    id="tab-rekap-mingguan"
                    onClick={() => setRekapTab('mingguan')}
                    className={`rounded-lg px-4 py-2 transition ${
                      rekapTab === 'mingguan'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    id="tab-rekap-bulanan"
                    onClick={() => setRekapTab('bulanan')}
                    className={`rounded-lg px-4 py-2 transition ${
                      rekapTab === 'bulanan'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>

              {/* TAB REKAP: MINGGUAN */}
              {rekapTab === 'mingguan' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">Periode Mingguan:</span>
                      <input
                        type="date"
                        value={weeklyStartDate}
                        onChange={(e) => setWeeklyStartDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium"
                      />
                      <span className="text-slate-400">s/d</span>
                      <input
                        type="date"
                        value={weeklyEndDate}
                        onChange={(e) => setWeeklyEndDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium"
                      />
                    </div>
                    <span className="font-semibold text-slate-500">
                      Senin - Minggu ({weeklyStartDate} s/d {weeklyEndDate})
                    </span>
                  </div>

                  {/* Table Rekap Mingguan */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">
                        Rekapitulasi Kehadiran Mingguan Staff
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Nama Staff</th>
                            <th className="px-5 py-3 font-semibold">Role</th>
                            <th className="px-5 py-3 font-semibold text-center text-emerald-600">Hadir</th>
                            <th className="px-5 py-3 font-semibold text-center text-amber-600">Izin</th>
                            <th className="px-5 py-3 font-semibold text-center text-blue-600">Sakit</th>
                            <th className="px-5 py-3 font-semibold text-center text-rose-600">Alpha</th>
                            <th className="px-5 py-3 font-semibold text-center">Total Hari</th>
                            <th className="px-5 py-3 font-semibold text-right">% Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {weeklyStats.map((st) => (
                            <tr key={st.staff.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold text-slate-900">{st.staff.nama}</td>
                              <td className="px-5 py-3 capitalize">{st.staff.role}</td>
                              <td className="px-5 py-3 text-center font-bold text-emerald-700">{st.hadir}</td>
                              <td className="px-5 py-3 text-center text-amber-700">{st.izin}</td>
                              <td className="px-5 py-3 text-center text-blue-700">{st.sakit}</td>
                              <td className="px-5 py-3 text-center font-bold text-rose-700">{st.alpha}</td>
                              <td className="px-5 py-3 text-center font-medium text-slate-600">{st.total}</td>
                              <td className="px-5 py-3 text-right">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    st.rate >= 80
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : st.rate >= 50
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {st.rate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB REKAP: BULANAN */}
              {rekapTab === 'bulanan' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">Pilih Bulan:</span>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium"
                      />
                    </div>
                    <span className="font-semibold text-slate-500">
                      Akumulasi Presensi Bulan {selectedMonth}
                    </span>
                  </div>

                  {/* Table Rekap Bulanan */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                      <h3 className="text-sm font-bold text-slate-800">
                        Rekapitulasi Kehadiran Bulanan Staff
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Nama Staff</th>
                            <th className="px-5 py-3 font-semibold">Role</th>
                            <th className="px-5 py-3 font-semibold text-center text-emerald-600">Hadir</th>
                            <th className="px-5 py-3 font-semibold text-center text-amber-600">Izin</th>
                            <th className="px-5 py-3 font-semibold text-center text-blue-600">Sakit</th>
                            <th className="px-5 py-3 font-semibold text-center text-rose-600">Alpha</th>
                            <th className="px-5 py-3 font-semibold text-center">Total Hari</th>
                            <th className="px-5 py-3 font-semibold text-right">% Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {monthlyStats.map((st) => (
                            <tr key={st.staff.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold text-slate-900">{st.staff.nama}</td>
                              <td className="px-5 py-3 capitalize">{st.staff.role}</td>
                              <td className="px-5 py-3 text-center font-bold text-emerald-700">{st.hadir}</td>
                              <td className="px-5 py-3 text-center text-amber-700">{st.izin}</td>
                              <td className="px-5 py-3 text-center text-blue-700">{st.sakit}</td>
                              <td className="px-5 py-3 text-center font-bold text-rose-700">{st.alpha}</td>
                              <td className="px-5 py-3 text-center font-medium text-slate-600">{st.total}</td>
                              <td className="px-5 py-3 text-right">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    st.rate >= 80
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : st.rate >= 50
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {st.rate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
