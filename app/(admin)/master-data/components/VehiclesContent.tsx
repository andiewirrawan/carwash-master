'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

export function VehiclesContent() {
  const { hasAccess, user } = useAuth();
  const canAccess = hasAccess('spv');

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

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-slate-600 mt-2">Anda tidak memiliki izin untuk mengelola Kategori Kendaraan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Kategori Kendaraan
          </h2>
          <p className="text-sm text-slate-500">
            Master data acuan jenis, merk, model, dan klasifikasi tipe ukuran.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
        >
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan merk, model, tipe..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="Mobil">Mobil</option>
            <option value="Motor">Motor</option>
            <option value="Truk">Truk / Niaga</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
              <tr>
                <th className="px-4 py-3.5">Jenis</th>
                <th className="px-4 py-3.5">Merk</th>
                <th className="px-4 py-3.5">Model</th>
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
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada data yang cocok.
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
                    <td className="whitespace-nowrap px-4 py-3 text-slate-800">{item.merk || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.model || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {item.tipe}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.keterangan || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#0A2A5E]"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
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

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Halaman {currentPage} dari {totalPages} ({filteredVehicles.length} data)</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const prev = Math.max(1, currentPage - 1);
                setCurrentPage(prev);
                setJumpPageInput(String(prev));
              }}
              disabled={currentPage === 1}
              className="rounded border border-slate-300 p-1 disabled:opacity-40"
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
              className="rounded border border-slate-300 p-1 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
              <h3 className="text-base font-bold">
                {editItem ? 'Edit Kategori Kendaraan' : 'Tambah Kategori Kendaraan'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-white">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Jenis Kendaraan *
                </label>
                <input
                  type="text"
                  value={kendaraan}
                  onChange={(e) => setKendaraan(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Merk Kendaraan
                </label>
                <input
                  type="text"
                  value={merk}
                  onChange={(e) => setMerk(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Model / Seri
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tipe / Ukuran Klasifikasi *
                </label>
                <input
                  type="text"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#F97316] px-5 py-2 text-xs font-semibold text-white hover:bg-[#ea580c] disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus kategori kendaraan ini?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
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
  );
}
