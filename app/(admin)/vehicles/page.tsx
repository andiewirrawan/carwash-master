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
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function VehiclesPage() {
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('admin');

  const [vehicles, setVehicles] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<VehicleCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states
  const [kendaraan, setKendaraan] = useState<string>('Mobil');
  const [merk, setMerk] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [tipe, setTipe] = useState<string>('Medium');
  const [kategoriInput, setKategoriInput] = useState<string>('1');
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
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
    setKategoriInput('1');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: VehicleCategory) => {
    setEditItem(item);
    setKendaraan(item.kendaraan);
    setMerk(item.merk || '');
    setModel(item.model || '');
    setTipe(item.tipe);
    setKategoriInput(item.kategori ? String(item.kategori) : '1');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!kendaraan.trim()) {
      setFormError('Jenis Kendaraan Wajib Diisi.');
      return;
    }
    if (!tipe.trim()) {
      setFormError('Tipe Kendaraan Wajib Diisi.');
      return;
    }

    const katNum = parseInt(kategoriInput, 10);

    setSaving(true);
    try {
      if (editItem) {
        await updateVehicleCategory(editItem.id, {
          kendaraan,
          merk: merk.trim() || null,
          model: model.trim() || null,
          tipe,
          kategori: isNaN(katNum) ? null : katNum,
        });
      } else {
        await addVehicleCategory({
          kendaraan,
          merk: merk.trim() || null,
          model: model.trim() || null,
          tipe,
          kategori: isNaN(katNum) ? null : katNum,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError('Gagal menyimpan data kategori kendaraan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await deleteVehicleCategory(deleteId);
    setDeleteId(null);
    await loadData();
  };

  // Filter & Search Logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.kendaraan.toLowerCase().includes(search.toLowerCase()) ||
        (v.merk && v.merk.toLowerCase().includes(search.toLowerCase())) ||
        (v.model && v.model.toLowerCase().includes(search.toLowerCase())) ||
        v.tipe.toLowerCase().includes(search.toLowerCase());

      const matchType = filterType === 'ALL' || v.kendaraan === filterType;

      return matchSearch && matchType;
    });
  }, [vehicles, search, filterType]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

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
              <Car className="h-6 w-6 text-[#F97316]" />
              CRUD Kategori Kendaraan (`vehicle_categories`)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola daftar jenis kendaraan, merk, model spesifik, tipe ukuran (Small, Medium, Large), dan kategori.
            </p>
          </div>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] transition-all"
            >
              <Plus className="h-4 w-4" />
              Tambah Kategori Baru
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kendaraan, merk, model..."
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
            <span className="font-semibold text-slate-700">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 focus:border-[#F97316] focus:outline-none"
            >
              <option value="ALL">Semua Kendaraan</option>
              <option value="Mobil">Mobil Saja</option>
              <option value="Motor">Motor Saja</option>
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
                  <th className="px-4 py-3.5">Kendaraan</th>
                  <th className="px-4 py-3.5">Merk</th>
                  <th className="px-4 py-3.5">Model / Seri</th>
                  <th className="px-4 py-3.5">Tipe Ukuran</th>
                  <th className="px-4 py-3.5 text-center">Kode Kategori</th>
                  {canEdit && <th className="px-4 py-3.5 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                        <span>Memuat data kategori kendaraan...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data kategori kendaraan.
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-400">#{item.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            item.kendaraan === 'Mobil'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.kendaraan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.merk || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.model || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {item.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-xs">
                          {item.kategori ?? '-'}
                        </span>
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
                  ))
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
                {filteredVehicles.length} data)
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

        {/* Modal Add / Edit */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E]">
                  {editItem ? 'Edit Kategori Kendaraan' : 'Tambah Kategori Kendaraan Baru'}
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
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kendaraan</label>
                  <select
                    value={kendaraan}
                    onChange={(e) => setKendaraan(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-[#F97316] focus:outline-none"
                  >
                    <option value="Mobil">Mobil</option>
                    <option value="Motor">Motor</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Merk (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Toyota, Honda"
                      value={merk}
                      onChange={(e) => setMerk(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Model / Seri</label>
                    <input
                      type="text"
                      placeholder="Contoh: Avanza / Fortuner"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipe Ukuran</label>
                    <select
                      value={tipe}
                      onChange={(e) => setTipe(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-[#F97316] focus:outline-none"
                    >
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kode Kategori (Int)</label>
                    <input
                      type="number"
                      placeholder="1, 2, 3..."
                      value={kategoriInput}
                      onChange={(e) => setKategoriInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                    />
                  </div>
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

        {/* Delete Confirmation Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus kategori kendaraan ini?
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
