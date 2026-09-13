'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, StaffKomisiMultiplier } from '@/types/database';
import {
  getStaffList,
  getStaffMultipliers,
  addStaffMultiplier,
  getEffectiveMultiplierForDate,
} from '@/lib/db';
import { formatDate, toInputDate } from '@/lib/format';
import Link from 'next/link';
import {
  Percent,
  Plus,
  Search,
  Check,
  AlertCircle,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

export default function GlobalStaffMultipliersPage() {
  const { user, hasAccess } = useAuth();
  const canAccess = hasAccess('spv');
  const canEdit = canAccess;

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliers, setMultipliers] = useState<StaffKomisiMultiplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number>(1);
  const [multiplierVal, setMultiplierVal] = useState<string>('10');
  const [berlakuMulai, setBerlakuMulai] = useState<string>(toInputDate('2026-12-01'));
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const loadData = async () => {
    setLoading(true);
    const [staffData, multData] = await Promise.all([
      getStaffList(),
      getStaffMultipliers(),
    ]);
    setStaffList(staffData);
    setMultipliers(multData);
    if (staffData.length > 0) {
      setSelectedStaffId(staffData[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMultiplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const multNum = parseFloat(multiplierVal);
    if (isNaN(multNum) || multNum < 0) {
      setFormError('Multiplier persen harus berupa angka 0 atau lebih.');
      return;
    }

    if (!berlakuMulai) {
      setFormError('Tanggal berlaku mulai wajib dipilih.');
      return;
    }

    setSaving(true);
    try {
      await addStaffMultiplier({
        staff_id: selectedStaffId,
        multiplier: multNum,
        berlaku_mulai: berlakuMulai,
        dientry_oleh: user?.id || null,
        dientry_oleh_nama: user ? `${user.nama} (${user.role})` : 'System',
        created_at: new Date().toISOString(),
      });

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError('Gagal menyimpan riwayat komisi multiplier.');
    } finally {
      setSaving(false);
    }
  };

  // Staff Map for quick name retrieval
  const staffMap = useMemo(() => {
    const map: Record<number, Staff> = {};
    staffList.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [staffList]);

  // Filtered Multipliers List
  const filteredMultipliers = useMemo(() => {
    return multipliers.filter((m) => {
      const staffObj = staffMap[m.staff_id];
      const staffName = staffObj ? staffObj.nama.toLowerCase() : '';
      const matchSearch = staffName.includes(search.toLowerCase());
      const matchStaff =
        selectedStaffFilter === 'ALL' || String(m.staff_id) === selectedStaffFilter;

      return matchSearch && matchStaff;
    });
  }, [multipliers, staffMap, search, selectedStaffFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMultipliers.length / pageSize));
  const paginatedMultipliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMultipliers.slice(start, start + pageSize);
  }, [filteredMultipliers, currentPage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  if (!canAccess) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-2xl py-12 px-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-slate-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Akses Terbatas: Khusus SPV / Owner / Sistem Owner
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Akun Anda saat ini memiliki role{' '}
                  <strong className="text-slate-900 capitalize">{user?.role || 'Admin / Kasir'}</strong>.
                  Sesuai ketentuan hak akses, <strong>Admin (Kasir)</strong> tidak dapat mengakses atau mengubah Master Data Komisi Multiplier.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0A2A5E] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                  >
                    Kembali ke Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
              <Percent className="h-6 w-6 text-[#F97316]" />
              Riwayat Komisi Multiplier (`staff_komisi_multiplier`)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Catatan historis multiplier bonus/insentif staff per tanggal berlaku efektif (format dd/mm/yyyy).
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => {
                setFormError('');
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none transition-all"
            >
              <Plus className="h-4 w-4" />
              Tambah Baris Multiplier Staff
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-xs text-xs text-slate-700 flex items-start gap-3">
          <Info className="h-5 w-5 text-[#F97316] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-[#0A2A5E]">Contoh Penggunaan Riwayat Multiplier:</p>
            <p className="text-slate-600">
              Misal staff <strong className="text-slate-900">Topa</strong>: 0% sejak awal (01/01/2025), lalu admin tambah baris baru +10% berlaku mulai <span className="font-bold text-indigo-700">01/12/2026</span>. Transaksi sebelum Des 2026 tetap dihitung 0%, dan transaksi mulai 01/12/2026 otomatis menggunakan multiplier +10%.
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama staff..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Pilih Staff:</span>
            <select
              value={selectedStaffFilter}
              onChange={(e) => {
                setSelectedStaffFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 focus:border-[#F97316] focus:outline-none"
            >
              <option value="ALL">Semua Staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">ID</th>
                  <th className="px-4 py-3.5">Nama Staff</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Multiplier (% Tambahan)</th>
                  <th className="px-4 py-3.5">Berlaku Mulai (dd/mm/yyyy)</th>
                  <th className="px-4 py-3.5">Di-entry Oleh</th>
                  <th className="px-4 py-3.5 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                        <span>Memuat riwayat multiplier...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMultipliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data riwayat multiplier.
                    </td>
                  </tr>
                ) : (
                  paginatedMultipliers.map((m) => {
                    const staffObj = staffMap[m.staff_id];
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-400">#{m.id}</td>
                        <td className="px-4 py-3 font-bold text-[#0A2A5E]">
                          {staffObj ? staffObj.nama : `Staff #${m.staff_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">
                            {staffObj ? staffObj.role : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-700 text-sm">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-indigo-800 border border-indigo-100">
                            +{m.multiplier}%
                          </span>
                        </td>
                        {/* Date formatted as dd/mm/yyyy */}
                        <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                          {formatDate(m.berlaku_mulai)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.dientry_oleh_nama || 'System'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/staff/${m.staff_id}/multiplier`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
                          >
                            Detail Staff <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Halaman <span className="font-bold text-slate-900">{currentPage}</span> dari{' '}
                <span className="font-bold text-slate-900">{totalPages}</span> (Total{' '}
                {filteredMultipliers.length} data)
              </span>

              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-500">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="w-12 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-center font-bold text-slate-800 focus:border-[#F97316] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-[#0A2A5E] px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-900"
                >
                  Go
                </button>
              </form>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Form: Add Staff Multiplier */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E]">
                  Tambah Multiplier Staff Baru
                </h3>
              </div>

              {formError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddMultiplier} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Staff</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 focus:border-[#F97316] focus:outline-none"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Multiplier (% Tambahan)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      placeholder="Contoh: 10 untuk +10%"
                      value={multiplierVal}
                      onChange={(e) => setMultiplierVal(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2.5 pl-3 pr-8 text-sm font-bold text-slate-900 focus:border-[#F97316] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Berlaku Mulai Tanggal (Efektif)
                  </label>
                  <input
                    type="date"
                    required
                    value={berlakuMulai}
                    onChange={(e) => setBerlakuMulai(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 font-semibold focus:border-[#F97316] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Format tampilan tanggal di aplikasi:{' '}
                    <span className="font-bold text-slate-700">{formatDate(berlakuMulai)}</span>.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C]"
                  >
                    {saving ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Simpan Baris Baru</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
