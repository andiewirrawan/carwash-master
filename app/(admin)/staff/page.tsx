'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, StaffRole } from '@/types/database';
import { getStaffList, addStaff, updateStaff, deleteStaff, getStaffMultipliers } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Percent,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  ArrowRight,
} from 'lucide-react';

export default function StaffPage() {
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('admin');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliersMap, setMultipliersMap] = useState<Record<number, { latest: number; date: string }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states
  const [nama, setNama] = useState<string>('');
  const [role, setRole] = useState<StaffRole>('washer');
  const [aktif, setAktif] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const loadData = async () => {
    setLoading(true);
    const [staffData, multData] = await Promise.all([
      getStaffList(),
      getStaffMultipliers(),
    ]);

    setStaffList(staffData);

    // Map latest multiplier per staff
    const mults: Record<number, { latest: number; date: string }> = {};
    staffData.forEach((s) => {
      const staffMults = multData
        .filter((m) => m.staff_id === s.id)
        .sort((a, b) => new Date(b.berlaku_mulai).getTime() - new Date(a.berlaku_mulai).getTime());

      if (staffMults.length > 0) {
        mults[s.id] = {
          latest: staffMults[0].multiplier,
          date: staffMults[0].berlaku_mulai,
        };
      } else {
        mults[s.id] = { latest: 0, date: '-' };
      }
    });

    setMultipliersMap(mults);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nama.trim()) {
      setFormError('Nama Staff Wajib Diisi.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await updateStaff(editItem.id, {
          nama: nama.trim(),
          role,
          aktif,
        });
      } else {
        await addStaff({
          nama: nama.trim(),
          role,
          aktif,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError('Gagal menyimpan data staff.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAktif = async (item: Staff) => {
    await updateStaff(item.id, { aktif: !item.aktif });
    await loadData();
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await deleteStaff(deleteId);
    setDeleteId(null);
    await loadData();
  };

  // Filter & Search Logic
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'ALL' || s.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [staffList, search, filterRole]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-[#F97316]" />
              CRUD Data Staff (`staff`)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola nama petugas washer, checker, leader, status aktif kerja, dan akses riwayat multiplier komisi.
            </p>
          </div>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] transition-all"
            >
              <Plus className="h-4 w-4" />
              Tambah Staff Baru
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
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
            <span className="font-semibold text-slate-700">Role Staff:</span>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 focus:border-[#F97316] focus:outline-none"
            >
              <option value="ALL">Semua Role</option>
              <option value="washer">Washer (Pencuci)</option>
              <option value="checker">Checker (Quality Control)</option>
              <option value="leader">Leader (Kepala Regu)</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">ID</th>
                  <th className="px-4 py-3.5">Nama Staff</th>
                  <th className="px-4 py-3.5">Role Tugas</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Multiplier Terbaru</th>
                  <th className="px-4 py-3.5 text-center">Riwayat Multiplier</th>
                  {canEdit && <th className="px-4 py-3.5 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                        <span>Memuat data staff...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data staff.
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((item) => {
                    const multInfo = multipliersMap[item.id] || { latest: 0, date: '-' };
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-400">#{item.id}</td>
                        <td className="px-4 py-3 font-bold text-[#0A2A5E] text-sm">{item.nama}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              item.role === 'washer'
                                ? 'bg-blue-100 text-blue-800'
                                : item.role === 'checker'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => canEdit && handleToggleAktif(item)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                              item.aktif
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Klik untuk ubah status keaktifan"
                          >
                            {item.aktif ? (
                              <>
                                <UserCheck className="h-3 w-3 text-emerald-600" /> Aktif
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3 text-slate-500" /> Non-Aktif
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              multInfo.latest > 0 ? 'text-indigo-700' : 'text-slate-600'
                            }`}
                          >
                            +{multInfo.latest}%
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({formatDate(multInfo.date)})
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/staff/${item.id}/multiplier`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <Percent className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Lihat / Tambah</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(item)}
                                className="rounded p-1 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(item.id)}
                                className="rounded p-1 text-slate-600 hover:bg-red-50 hover:text-red-600"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
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
                {filteredStaff.length} data)
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

        {/* Modal Add / Edit Staff */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E]">
                  {editItem ? 'Edit Data Staff' : 'Tambah Staff Baru'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Staff</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Topa / Budi Santoso"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Tugas</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-[#F97316] focus:outline-none"
                  >
                    <option value="washer">washer (Pencuci)</option>
                    <option value="checker">checker (Quality Control)</option>
                    <option value="leader">leader (Kepala Regu)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="staffAktifCheck"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                  />
                  <label htmlFor="staffAktifCheck" className="font-semibold text-slate-700">
                    Status Staff Aktif Bekerja
                  </label>
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
                        <span>Simpan Data</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus data staff ini?
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
