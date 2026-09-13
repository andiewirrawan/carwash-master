'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, StaffKomisiMultiplier } from '@/types/database';
import {
  getStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  getStaffMultipliers,
  addStaffMultiplier,
} from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Percent,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
  History,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export default function StaffPage() {
  const { hasAccess, user } = useAuth();
  const canAccess = hasAccess('spv'); // SPV, Owner, Sistem Owner

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliers, setMultipliers] = useState<StaffKomisiMultiplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Staff Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states (TEKS BEBAS untuk role)
  const [nama, setNama] = useState<string>('');
  const [role, setRole] = useState<string>('washer');
  const [aktif, setAktif] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Multiplier History Modal states
  const [historyModalStaff, setHistoryModalStaff] = useState<Staff | null>(null);
  const [newMultiplierVal, setNewMultiplierVal] = useState<string>('10');
  const [newBerlakuMulai, setNewBerlakuMulai] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [savingMultiplier, setSavingMultiplier] = useState<boolean>(false);
  const [multiplierError, setMultiplierError] = useState<string>('');

  // Pagination states
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
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute latest multiplier per staff (berlaku_mulai <= today, sorted DESC)
  const latestMultipliersMap = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const map: Record<number, { multiplier: number; berlaku_mulai: string }> = {};

    staffList.forEach((s) => {
      const staffMults = multipliers.filter((m) => m.staff_id === s.id);
      const valid = staffMults.filter((m) => m.berlaku_mulai <= today);
      if (valid.length > 0) {
        valid.sort((a, b) => b.berlaku_mulai.localeCompare(a.berlaku_mulai));
        map[s.id] = {
          multiplier: valid[0].multiplier,
          berlaku_mulai: valid[0].berlaku_mulai,
        };
      } else if (staffMults.length > 0) {
        // Fallback to earliest entry
        staffMults.sort((a, b) => a.berlaku_mulai.localeCompare(b.berlaku_mulai));
        map[s.id] = {
          multiplier: staffMults[0].multiplier,
          berlaku_mulai: staffMults[0].berlaku_mulai,
        };
      } else {
        map[s.id] = { multiplier: 0, berlaku_mulai: '-' };
      }
    });

    return map;
  }, [staffList, multipliers]);

  const openAddModal = () => {
    setEditItem(null);
    setNama('');
    setRole('washer');
    setAktif(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: Staff) => {
    setEditItem(item);
    setNama(item.nama);
    setRole(item.role);
    setAktif(item.aktif);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nama.trim()) {
      setFormError('Nama staff wajib diisi.');
      return;
    }
    if (!role.trim()) {
      setFormError('Role staff wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await updateStaff(editItem.id, {
          nama: nama.trim(),
          role: role.trim().toLowerCase(),
          aktif,
        });
      } else {
        await addStaff({
          nama: nama.trim(),
          role: role.trim().toLowerCase(),
          aktif,
        });
      }
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data staff.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteStaff(deleteId);
      await loadData();
      setDeleteId(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Add new multiplier row for a staff
  const handleAddNewMultiplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyModalStaff) return;
    setMultiplierError('');

    const multNum = parseFloat(newMultiplierVal);
    if (isNaN(multNum)) {
      setMultiplierError('Nilai multiplier harus berupa angka.');
      return;
    }
    if (!newBerlakuMulai) {
      setMultiplierError('Tanggal berlaku mulai wajib ditentukan.');
      return;
    }

    setSavingMultiplier(true);
    try {
      await addStaffMultiplier({
        staff_id: historyModalStaff.id,
        multiplier: multNum,
        berlaku_mulai: newBerlakuMulai,
        dientry_oleh: user?.id || null,
        dientry_oleh_nama: user?.nama || 'SPV/Owner',
        created_at: new Date().toISOString(),
      });
      const multData = await getStaffMultipliers();
      setMultipliers(multData);
      setNewMultiplierVal('10');
    } catch (err: any) {
      setMultiplierError(err.message || 'Gagal menambahkan riwayat multiplier.');
    } finally {
      setSavingMultiplier(false);
    }
  };

  // Filter & Search
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase());

      const matchRole =
        filterRole === 'ALL' || s.role.toLowerCase() === filterRole.toLowerCase();

      return matchSearch && matchRole;
    });
  }, [staffList, search, filterRole]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Staff history filtered list
  const staffHistoryList = useMemo(() => {
    if (!historyModalStaff) return [];
    return multipliers
      .filter((m) => m.staff_id === historyModalStaff.id)
      .sort((a, b) => b.berlaku_mulai.localeCompare(a.berlaku_mulai));
  }, [multipliers, historyModalStaff]);

  // Route Guard Check for Admin (Kasir)
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
                  Sesuai ketentuan, <strong>Admin (Kasir)</strong> tidak memiliki izin mengakses atau mengubah Master Data Staff.
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
        {/* Header Title & Top Action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Data Staff & Riwayat Multiplier
            </h1>
            <p className="text-sm text-slate-500">
              Kelola daftar personil operasional car wash dan penyesuaian multiplier komisi tanpa menghapus riwayat lama.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/staff-multipliers"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <History className="h-4 w-4 text-[#0A2A5E]" />
              Semua Riwayat Multiplier
            </Link>

            <button
              id="btn-tambah-staff"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus:outline-hidden focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Tambah Staff Baru
            </button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="input-cari-staff"
              type="text"
              placeholder="Cari berdasarkan nama staff atau role..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              id="select-filter-role"
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
            >
              <option value="ALL">Semua Role</option>
              <option value="washer">Washer</option>
              <option value="checker">Checker</option>
              <option value="leader">Leader</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Nama Staff</th>
                  <th className="px-4 py-3.5">Peran / Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Multiplier Aktif</th>
                  <th className="px-4 py-3.5">Riwayat Multiplier</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                      <p className="mt-2 text-xs">Memuat data staff...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Tidak ada data staff yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => {
                    const multInfo = latestMultipliersMap[item.id] || { multiplier: 0, berlaku_mulai: '-' };
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">
                          #{item.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                          {item.nama}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#0A2A5E]">
                            {item.role}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {item.aktif ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
                              multInfo.multiplier > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Percent className="h-3 w-3" />
                            {multInfo.multiplier > 0 ? `+${multInfo.multiplier}%` : '0%'}
                          </span>
                          {multInfo.berlaku_mulai !== '-' && (
                            <span className="ml-1.5 text-xs text-slate-400 font-normal">
                              (sejak {formatDate(multInfo.berlaku_mulai)})
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            id={`btn-history-staff-${item.id}`}
                            onClick={() => setHistoryModalStaff(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-[#0A2A5E] hover:bg-blue-50"
                          >
                            <History className="h-3.5 w-3.5 text-[#F97316]" />
                            Lihat & Tambah Multiplier
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-edit-staff-${item.id}`}
                              onClick={() => openEditModal(item)}
                              title="Edit Staff"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#0A2A5E]"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              id={`btn-delete-staff-${item.id}`}
                              onClick={() => setDeleteId(item.id)}
                              title="Hapus Staff"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Halaman {currentPage} dari {totalPages} ({filteredStaff.length} staff)</span>
            </div>

            <div className="flex items-center gap-3">
              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Ke halaman:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="w-14 rounded border border-slate-300 px-2 py-1 text-center text-xs focus:border-[#0A2A5E] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Go
                </button>
              </form>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const prev = Math.max(1, currentPage - 1);
                    setCurrentPage(prev);
                    setJumpPageInput(String(prev));
                  }}
                  disabled={currentPage === 1}
                  className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const next = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(next);
                    setJumpPageInput(String(next));
                  }}
                  disabled={currentPage === totalPages}
                  className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: Tambah / Edit Staff */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
                <div className="flex items-center gap-2.5">
                  <Users className="h-5 w-5 text-[#F97316]" />
                  <h3 className="text-base font-bold">
                    {editItem ? 'Edit Data Staff' : 'Tambah Staff Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-300 hover:bg-blue-900 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitStaff} className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap Staff *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Topa, Budi Santoso..."
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                </div>

                {/* ROLE (TEKS BEBAS) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Peran / Role (Teks Bebas) *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: washer, checker, leader, marketing, kasir..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>Pilihan cepat:</span>
                    {['washer', 'checker', 'leader', 'marketing'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-xs hover:bg-slate-200 uppercase font-medium"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Aktif */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="chk-aktif"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0A2A5E] focus:ring-[#0A2A5E]"
                  />
                  <label htmlFor="chk-aktif" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Staff Aktif Bekerja
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#ea580c] disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Riwayat & Tambah Multiplier Komisi per Staff */}
        {historyModalStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
                <div className="flex items-center gap-2.5">
                  <History className="h-5 w-5 text-[#F97316]" />
                  <div>
                    <h3 className="text-base font-bold">
                      Riwayat Komisi Multiplier: {historyModalStaff.nama}
                    </h3>
                    <p className="text-xs text-blue-200">
                      Peran: <span className="uppercase font-semibold">{historyModalStaff.role}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalStaff(null)}
                  className="rounded-lg p-1 text-slate-300 hover:bg-blue-900 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Form Tambah Baris Baru Multiplier */}
                <form
                  onSubmit={handleAddNewMultiplier}
                  className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0A2A5E] uppercase tracking-wider">
                    <Plus className="h-4 w-4" />
                    Tambah Riwayat Multiplier Baru
                  </div>
                  <p className="text-xs text-slate-600">
                    Menambah baris baru (multiplier + tanggal berlaku mulai) tanpa menghapus riwayat lama.
                    Transaksi sebelum tanggal ini akan tetap dihitung menggunakan multiplier sebelumnya.
                  </p>

                  {multiplierError && (
                    <div className="flex items-center gap-2 rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{multiplierError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Multiplier Tambahan (%) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Contoh: 10 (+10%) atau 0"
                          value={newMultiplierVal}
                          onChange={(e) => setNewMultiplierVal(e.target.value)}
                          required
                          className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#0A2A5E] focus:outline-hidden pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                          %
                        </span>
                      </div>
                      <div className="mt-1 flex gap-1 text-[11px] text-slate-500">
                        <span>Pilihan:</span>
                        {['0', '5', '10', '15', '20'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewMultiplierVal(p)}
                            className="rounded bg-white border border-slate-200 px-1.5 py-0.5 hover:bg-slate-100"
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Berlaku Mulai Tanggal *
                      </label>
                      <input
                        type="date"
                        value={newBerlakuMulai}
                        onChange={(e) => setNewBerlakuMulai(e.target.value)}
                        required
                        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingMultiplier}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A2A5E] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                    >
                      {savingMultiplier ? 'Menyimpan...' : 'Simpan Multiplier Baru'}
                    </button>
                  </div>
                </form>

                {/* List Riwayat Multiplier Staff */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Daftar Riwayat Perubahan Multiplier ({staffHistoryList.length} Entri)
                  </h4>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5">Multiplier</th>
                          <th className="px-3 py-2.5">Berlaku Mulai</th>
                          <th className="px-3 py-2.5">Dicatat Oleh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {staffHistoryList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-slate-400">
                              Belum ada catatan riwayat multiplier.
                            </td>
                          </tr>
                        ) : (
                          staffHistoryList.map((m, idx) => (
                            <tr key={m.id} className={idx === 0 ? 'bg-blue-50/40 font-medium' : ''}>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold ${
                                    m.multiplier > 0
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {m.multiplier > 0 ? `+${m.multiplier}%` : '0%'}
                                </span>
                                {idx === 0 && (
                                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    Paling Baru
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-900">
                                {formatDate(m.berlaku_mulai)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-500">
                                {m.dientry_oleh_nama || 'System'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 p-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryModalStaff(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Hapus Confirmation */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data staff ini?
                Semua riwayat multiplier yang terhubung juga akan terhapus.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStaff}
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
