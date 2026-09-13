'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { VehicleCategory } from '@/types/database';
import {
  getVehicleCategories,
  addVehicleCategory,
  updateVehicleCategory,
  deleteVehicleCategory,
} from '@/lib/db';
import {
  Car,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

export default function VehiclesPage() {
  const { hasAccess, user } = useAuth();
  const canAccess = hasAccess('spv'); // SPV, Owner, Sistem Owner

  const [vehicles, setVehicles] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<VehicleCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states (TEKS BEBAS - fleksibel)
  const [kendaraan, setKendaraan] = useState<string>('Mobil');
  const [merk, setMerk] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [tipe, setTipe] = useState<string>('Medium');
  const [keterangan, setKeterangan] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const loadData = async () => {
    setLoading(true);
    const data = await getVehicleCategories();
    setVehicles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditItem(null);
    setKendaraan('Mobil');
    setMerk('');
    setModel('');
    setTipe('Medium');
    setKeterangan('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: VehicleCategory) => {
    setEditItem(item);
    setKendaraan(item.kendaraan);
    setMerk(item.merk || '');
    setModel(item.model || '');
    setTipe(item.tipe);
    setKeterangan(item.keterangan || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!kendaraan.trim()) {
      setFormError('Jenis kendaraan wajib diisi.');
      return;
    }
    if (!tipe.trim()) {
      setFormError('Tipe / Ukuran kendaraan wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await updateVehicleCategory(editItem.id, {
          kendaraan: kendaraan.trim(),
          merk: merk.trim() || null,
          model: model.trim() || null,
          tipe: tipe.trim(),
          keterangan: keterangan.trim() || null,
        });
      } else {
        await addVehicleCategory({
          kendaraan: kendaraan.trim(),
          merk: merk.trim() || null,
          model: model.trim() || null,
          tipe: tipe.trim(),
          keterangan: keterangan.trim() || null,
        });
      }
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan kategori kendaraan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteVehicleCategory(deleteId);
      await loadData();
      setDeleteId(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Filter & Search
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.kendaraan.toLowerCase().includes(search.toLowerCase()) ||
        (v.merk && v.merk.toLowerCase().includes(search.toLowerCase())) ||
        (v.model && v.model.toLowerCase().includes(search.toLowerCase())) ||
        v.tipe.toLowerCase().includes(search.toLowerCase()) ||
        (v.keterangan && v.keterangan.toLowerCase().includes(search.toLowerCase()));

      const matchType =
        filterType === 'ALL' || v.kendaraan.toLowerCase() === filterType.toLowerCase();

      return matchSearch && matchType;
    });
  }, [vehicles, search, filterType]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

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
                  Sesuai ketentuan, <strong>Admin (Kasir)</strong> tidak memiliki akses untuk mengubah Master Data Kategori Kendaraan.
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
        {/* Page Title & Top Action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Kategori Kendaraan (Vehicle Categories)
            </h1>
            <p className="text-sm text-slate-500">
              Master data acuan jenis, merk, model, dan klasifikasi tipe ukuran (Small, Medium, Large, dsb).
            </p>
          </div>

          <button
            id="btn-tambah-kendaraan"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus:outline-hidden focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Kategori Kendaraan
          </button>
        </div>

        {/* Filter & Search */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="input-cari-kendaraan"
              type="text"
              placeholder="Cari berdasarkan jenis, merk, model, tipe, atau keterangan..."
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
              id="select-filter-jenis-kendaraan"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="Mobil">Mobil</option>
              <option value="Motor">Motor</option>
              <option value="Truk">Truk / Niaga</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-3.5">Jenis</th>
                  <th className="px-4 py-3.5">Merk</th>
                  <th className="px-4 py-3.5">Model / Contoh Seri</th>
                  <th className="px-4 py-3.5">Tipe / Ukuran</th>
                  <th className="px-4 py-3.5">Keterangan</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                      <p className="mt-2 text-xs">Memuat kategori kendaraan...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Tidak ada data kategori kendaraan yang cocok.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#0A2A5E]">
                          {item.kendaraan}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                        {item.merk || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.model || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {item.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.keterangan || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-edit-veh-${item.id}`}
                            onClick={() => openEditModal(item)}
                            title="Edit Kategori"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#0A2A5E]"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            id={`btn-delete-veh-${item.id}`}
                            onClick={() => setDeleteId(item.id)}
                            title="Hapus Kategori"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Halaman {currentPage} dari {totalPages} ({filteredVehicles.length} data)</span>
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

        {/* MODAL: Tambah / Edit Vehicle Category */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
                <div className="flex items-center gap-2.5">
                  <Car className="h-5 w-5 text-[#F97316]" />
                  <h3 className="text-base font-bold">
                    {editItem ? 'Edit Kategori Kendaraan' : 'Tambah Kategori Kendaraan'}
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-300 hover:bg-blue-900 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Jenis Kendaraan (TEKS BEBAS) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Jenis Kendaraan (Teks Bebas) *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mobil, Motor, Truk, Bus..."
                    value={kendaraan}
                    onChange={(e) => setKendaraan(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <span>Saran cepat:</span>
                    {['Mobil', 'Motor', 'Truk'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKendaraan(k)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-xs hover:bg-slate-200"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merk */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Merk Kendaraan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Toyota, Honda, Yamaha, Suzuki..."
                    value={merk}
                    onChange={(e) => setMerk(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                </div>

                {/* Model / Seri */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Model / Contoh Seri (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Avanza / Xenia / Ertiga..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                </div>

                {/* Tipe / Ukuran (TEKS BEBAS) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipe / Ukuran Klasifikasi (Teks Bebas) *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Small, Medium, Large, Luxury..."
                    value={tipe}
                    onChange={(e) => setTipe(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <span>Saran cepat:</span>
                    {['Small', 'Medium', 'Large', 'Luxury'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipe(t)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-xs hover:bg-slate-200"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: MPV Kompak Standard, SUV Premium..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
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
                    {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Kategori'}
                  </button>
                </div>
              </form>
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
                Apakah Anda yakin ingin menghapus kategori kendaraan ini?
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
                  onClick={handleDelete}
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
