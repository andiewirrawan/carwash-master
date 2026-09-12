'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getKomisiPerStaff,
  getStaffList,
  getTransactions,
  getTransactionStaff,
} from '@/lib/db';
import { formatNominal, formatDate } from '@/lib/format';
import { KomisiPerStaff, Staff, Transaction, TransactionStaff } from '@/types/database';
import {
  Award,
  Users,
  Search,
  Printer,
  Calendar,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function KomisiWasherPage() {
  const { isSpv, isOwner, isSistemOwner } = useAuth();
  const isAuthorized = isSpv || isOwner || isSistemOwner;

  const [loading, setLoading] = useState<boolean>(true);
  const [komisiData, setKomisiData] = useState<KomisiPerStaff[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [, setAllTransactions] = useState<Transaction[]>([]);
  const [, setAllStaffTransactions] = useState<TransactionStaff[]>([]);

  // Filter States
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-12');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<'nama' | 'tanggal' | 'total_komisi'>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Print ref
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Quick Preset Filters
  const applyPreset = (preset: 'today' | 'this_week' | 'this_month') => {
    const today = new Date(2026, 8, 12);
    if (preset === 'today') {
      const dStr = '2026-09-12';
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'this_week') {
      setStartDate('2026-09-07');
      setEndDate('2026-09-12');
    } else if (preset === 'this_month') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!isAuthorized) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const staffIdNum = selectedStaffId !== 'all' ? parseInt(selectedStaffId, 10) : undefined;
        const roleStr = selectedRole !== 'all' ? selectedRole : undefined;

        const [komisi, staff, trxs, staffTrxs] = await Promise.all([
          getKomisiPerStaff({
            startDate,
            endDate,
            staffId: staffIdNum,
            role: roleStr,
          }),
          getStaffList(),
          getTransactions({ status: 'aktif' }),
          getTransactionStaff(),
        ]);

        setKomisiData(komisi);
        setStaffList(staff);
        setAllTransactions(trxs);
        setAllStaffTransactions(staffTrxs);
      } catch (err) {
        console.error('Error fetching komisi data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [startDate, endDate, selectedStaffId, selectedRole, isAuthorized]);

  // Filtered Komisi List
  const filteredKomisi = useMemo(() => {
    return komisiData.filter((k) => {
      const matchesSearch =
        k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDate(k.tanggal).includes(searchQuery);
      return matchesSearch;
    });
  }, [komisiData, searchQuery]);

  // Sorted Komisi
  const sortedKomisi = useMemo(() => {
    return [...filteredKomisi].sort((a, b) => {
      if (sortField === 'nama') {
        const cmp = a.nama.localeCompare(b.nama);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'tanggal') {
        const cmp = a.tanggal.localeCompare(b.tanggal);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'total_komisi') {
        return sortOrder === 'asc'
          ? a.total_komisi - b.total_komisi
          : b.total_komisi - a.total_komisi;
      }
      return 0;
    });
  }, [filteredKomisi, sortField, sortOrder]);

  // Total Summary
  const totalKomisiAll = useMemo(() => {
    return sortedKomisi.reduce((acc, curr) => acc + curr.total_komisi, 0);
  }, [sortedKomisi]);

  // Aggregate by Staff summary
  const staffSummaryMap = useMemo(() => {
    const map = new Map<number, { nama: string; role: string; total: number; days: number }>();
    for (const item of sortedKomisi) {
      const existing = map.get(item.id) || {
        nama: item.nama,
        role: item.role,
        total: 0,
        days: 0,
      };
      existing.total += item.total_komisi;
      existing.days += 1;
      map.set(item.id, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [sortedKomisi]);

  // Print Trigger
  const handlePrint = () => {
    window.print();
  };

  const toggleSort = (field: 'nama' | 'tanggal' | 'total_komisi') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Akses Terbatas</h2>
          <p className="mt-2 text-xs text-slate-600">
            Halaman Rekap Komisi Washer & Petugas ini hanya dapat diakses oleh role SPV, Owner, atau
            Sistem Owner.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Rekap Komisi Washer & Petugas
                </h1>
                <p className="text-xs text-slate-500">
                  Perhitungan komisi real-time dari SQL View <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-mono">komisi_per_staff</code>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A2A5E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-900 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Cetak / Print Laporan
            </button>
          </div>
        </div>

        {/* 3 Summary Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Komisi Terhitung
            </span>
            <p className="mt-2 text-2xl font-extrabold text-[#0A2A5E]">
              {loading ? '...' : formatNominal(totalKomisiAll)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Periode: {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Staff Terlibat
            </span>
            <p className="mt-2 text-2xl font-extrabold text-purple-700">
              {loading ? '...' : staffSummaryMap.length}{' '}
              <span className="text-xs font-normal text-slate-500">orang</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Washer, Checker & Leader</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Komisi / Staff
            </span>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">
              {loading || staffSummaryMap.length === 0
                ? '0'
                : formatNominal(Math.round(totalKomisiAll / staffSummaryMap.length))}
            </p>
            <p className="mt-1 text-xs text-slate-500">Sesuai filter tanggal aktif</p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Filter className="h-4 w-4 text-[#0A2A5E]" />
              Filter Periode & Petugas
            </div>
            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">Preset:</span>
              <button
                onClick={() => applyPreset('today')}
                className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Hari Ini
              </button>
              <button
                onClick={() => applyPreset('this_week')}
                className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Minggu Ini
              </button>
              <button
                onClick={() => applyPreset('this_month')}
                className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-[#0A2A5E] hover:bg-blue-100 border border-blue-200"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
              />
            </div>

            {/* Staff Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Pilih Staff
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
              >
                <option value="all">Semua Staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Filter Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
              >
                <option value="all">Semua Role</option>
                <option value="washer">Washer</option>
                <option value="checker">Checker</option>
                <option value="leader">Leader</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative pt-2">
            <Search className="absolute left-3 top-4.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama staff atau tanggal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0A2A5E] focus:outline-none"
            />
          </div>
        </div>

        {/* Printable / Report View Section */}
        <div ref={printAreaRef} className="space-y-6">
          {/* Printable Header (Visible during Print) */}
          <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wide">BSA Car Wash - Sistem Kasir</h1>
            <p className="text-sm">Laporan Rekapitulasi Komisi Petugas & Washer</p>
            <p className="text-xs text-slate-600 mt-1">
              Periode: {formatDate(startDate)} s/d {formatDate(endDate)} | Tanggal Cetak:{' '}
              {formatDate('2026-09-12')}
            </p>
          </div>

          {/* Table: Daily Commission Records */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Rincian Komisi Harian per Petugas
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {sortedKomisi.length} baris data ditemukan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No.</th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:text-slate-900"
                      onClick={() => toggleSort('tanggal')}
                    >
                      <div className="flex items-center gap-1">
                        Tanggal
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:text-slate-900"
                      onClick={() => toggleSort('nama')}
                    >
                      <div className="flex items-center gap-1">
                        Nama Petugas
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3">Role</th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:text-slate-900"
                      onClick={() => toggleSort('total_komisi')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Komisi Bersih
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        Memuat data komisi...
                      </td>
                    </tr>
                  ) : sortedKomisi.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        Tidak ada komisi yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    sortedKomisi.map((item, idx) => (
                      <tr key={`${item.id}-${item.tanggal}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {formatDate(item.tanggal)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.nama}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                              item.role === 'washer'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : item.role === 'checker'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#0A2A5E]">
                          {formatNominal(item.total_komisi)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sortedKomisi.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right uppercase text-[11px]">
                        Total Keseluruhan Komisi:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-extrabold text-[#0A2A5E]">
                        {formatNominal(totalKomisiAll)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Per-Staff Summary Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0A2A5E]" />
              Akumulasi Komisi per Staff (Periode Terpilih)
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffSummaryMap.map((staff) => (
                <div
                  key={staff.nama}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{staff.nama}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold uppercase text-slate-500">
                        {staff.role}
                      </span>
                      <span className="text-[10px] text-slate-400">• {staff.days} hari kerja</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-purple-700">
                      {formatNominal(staff.total)}
                    </p>
                    <p className="text-[10px] text-slate-400">Total Periode</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
