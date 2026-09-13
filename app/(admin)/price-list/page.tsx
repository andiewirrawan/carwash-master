'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { PriceList } from '@/types/database';
import { getPriceList, addPriceList, updatePriceList, deletePriceList } from '@/lib/db';
import { formatNominal, parseNominal } from '@/lib/format';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Filter,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Coins,
} from 'lucide-react';
import Link from 'next/link';

interface RoleKomisiRow {
  peran: string;
  komisi: string;
}

export default function PriceListPage() {
  const { hasAccess, user } = useAuth();
  const canAccess = hasAccess('spv'); // SPV, Owner, Sistem Owner

  const [prices, setPrices] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterVehicle, setFilterVehicle] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<PriceList | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states (TEKS BEBAS - fleksibel tanpa enum kaku)
  const [kendaraan, setKendaraan] = useState<string>('Mobil');
  const [paket, setPaket] = useState<string>('');
  const [fasilitas, setFasilitas] = useState<string>('');
  const [tipe, setTipe] = useState<string>('Medium');
  const [hargaInput, setHargaInput] = useState<string>('');
  const [rolesKomisi, setRolesKomisi] = useState<RoleKomisiRow[]>([
    { peran: 'washer', komisi: '10.000' },
    { peran: 'checker', komisi: '5.000' },
  ]);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const loadData = async () => {
    setLoading(true);
    const data = await getPriceList();
    setPrices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditItem(null);
    setKendaraan('Mobil');
    setPaket('');
    setFasilitas('');
    setTipe('Medium');
    setHargaInput('');
    setRolesKomisi([
      { peran: 'washer', komisi: '10.000' },
      { peran: 'checker', komisi: '5.000' },
    ]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: PriceList) => {
    setEditItem(item);
    setKendaraan(item.kendaraan);
    setPaket(item.paket);
    setFasilitas(item.fasilitas);
    setTipe(item.tipe);
    setHargaInput(formatNominal(item.harga));

    if (item.komisi_list && item.komisi_list.length > 0) {
      setRolesKomisi(
        item.komisi_list.map((k) => ({
          peran: k.peran,
          komisi: formatNominal(k.komisi),
        }))
      );
    } else {
      // Fallback from legacy helpers
      const initialList: RoleKomisiRow[] = [];
      if (item.komisi_washer) {
        initialList.push({ peran: 'washer', komisi: formatNominal(item.komisi_washer) });
      }
      if (item.komisi_checker) {
        initialList.push({ peran: 'checker', komisi: formatNominal(item.komisi_checker) });
      }
      if (initialList.length === 0) {
        initialList.push({ peran: 'washer', komisi: '0' });
      }
      setRolesKomisi(initialList);
    }

    setFormError('');
    setModalOpen(true);
  };

  // Subform role komisi row handlers
  const handleAddRoleRow = () => {
    setRolesKomisi((prev) => [...prev, { peran: '', komisi: '0' }]);
  };

  const handleRemoveRoleRow = (index: number) => {
    setRolesKomisi((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRoleChange = (index: number, field: 'peran' | 'komisi', value: string) => {
    setRolesKomisi((prev) => {
      const copy = [...prev];
      if (field === 'komisi') {
        const num = parseNominal(value);
        copy[index] = {
          ...copy[index],
          komisi: isNaN(num) ? value : formatNominal(num),
        };
      } else {
        copy[index] = { ...copy[index], peran: value };
      }
      return copy;
    });
  };

  const handleHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const num = parseNominal(rawVal);
    if (isNaN(num)) {
      setHargaInput(rawVal);
    } else {
      setHargaInput(formatNominal(num));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!kendaraan.trim()) {
      setFormError('Kolom Jenis Kendaraan wajib diisi.');
      return;
    }
    if (!paket.trim()) {
      setFormError('Nama Paket Layanan wajib diisi.');
      return;
    }
    if (!tipe.trim()) {
      setFormError('Tipe / Ukuran Kendaraan wajib diisi.');
      return;
    }
    if (!fasilitas.trim()) {
      setFormError('Fasilitas wajib diisi.');
      return;
    }

    const hargaNum = parseNominal(hargaInput);
    if (isNaN(hargaNum) || hargaNum <= 0) {
      setFormError('Harga Paket harus berupa angka lebih dari 0.');
      return;
    }

    // Validate role commission subform
    const cleanKomisi = rolesKomisi
      .filter((r) => r.peran.trim() !== '')
      .map((r) => ({
        peran: r.peran.trim().toLowerCase(),
        komisi: parseNominal(r.komisi) || 0,
      }));

    setSaving(true);
    try {
      if (editItem) {
        await updatePriceList(
          editItem.id,
          {
            kendaraan: kendaraan.trim(),
            paket: paket.trim(),
            fasilitas: fasilitas.trim(),
            tipe: tipe.trim(),
            harga: hargaNum,
          },
          cleanKomisi
        );
      } else {
        await addPriceList(
          {
            kendaraan: kendaraan.trim(),
            paket: paket.trim(),
            fasilitas: fasilitas.trim(),
            tipe: tipe.trim(),
            harga: hargaNum,
          },
          cleanKomisi
        );
      }
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan perubahan price list.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deletePriceList(deleteId);
      await loadData();
      setDeleteId(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Filter & Search
  const filteredPrices = useMemo(() => {
    return prices.filter((p) => {
      const matchSearch =
        p.paket.toLowerCase().includes(search.toLowerCase()) ||
        p.kendaraan.toLowerCase().includes(search.toLowerCase()) ||
        p.tipe.toLowerCase().includes(search.toLowerCase()) ||
        p.fasilitas.toLowerCase().includes(search.toLowerCase());

      const matchVeh =
        filterVehicle === 'ALL' || p.kendaraan.toLowerCase() === filterVehicle.toLowerCase();

      return matchSearch && matchVeh;
    });
  }, [prices, search, filterVehicle]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPrices.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPrices.slice(start, start + pageSize);
  }, [filteredPrices, currentPage, pageSize]);

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
                  Sesuai ketentuan hak akses, <strong>Admin (Kasir)</strong> hanya bertugas menginput transaksi
                  harian dan <strong>tidak dapat mengakses atau mengubah Master Data</strong> (Daftar Harga, Staff,
                  Kategori Kendaraan, Komisi Multiplier).
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
        {/* Page Title & Top Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daftar Harga & Komisi (Price List)
            </h1>
            <p className="text-sm text-slate-500">
              Kelola katalog layanan cuci, harga standar, serta komisi per role secara fleksibel.
            </p>
          </div>

          <button
            id="btn-tambah-paket"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus:outline-hidden focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Paket Baru
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="input-cari-paket"
              type="text"
              placeholder="Cari berdasarkan paket, kendaraan, tipe, atau fasilitas..."
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
              id="select-filter-kendaraan"
              value={filterVehicle}
              onChange={(e) => {
                setFilterVehicle(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
            >
              <option value="ALL">Semua Jenis Kendaraan</option>
              <option value="Mobil">Mobil</option>
              <option value="Motor">Motor</option>
              <option value="Truk">Truk / Kendaraan Niaga</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-3.5">Kendaraan</th>
                  <th className="px-4 py-3.5">Paket Layanan</th>
                  <th className="px-4 py-3.5">Tipe / Ukuran</th>
                  <th className="px-4 py-3.5">Fasilitas Termasuk</th>
                  <th className="px-4 py-3.5 text-right">Harga</th>
                  <th className="px-4 py-3.5">Komisi per Role</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                      <p className="mt-2 text-xs">Memuat daftar harga...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Tidak ada data harga yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#0A2A5E]">
                          {item.kendaraan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.paket}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.tipe}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-slate-500">
                        <p className="line-clamp-2">{item.fasilitas}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900">
                        {formatNominal(item.harga)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.komisi_list && item.komisi_list.length > 0 ? (
                            item.komisi_list.map((k, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200"
                              >
                                <span className="font-semibold capitalize text-[#0A2A5E]">{k.peran}:</span>
                                <span>{formatNominal(k.komisi)}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum diatur</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-edit-${item.id}`}
                            onClick={() => openEditModal(item)}
                            title="Edit Paket"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#0A2A5E]"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            id={`btn-delete-${item.id}`}
                            onClick={() => setDeleteId(item.id)}
                            title="Hapus Paket"
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
              <span>Halaman {currentPage} dari {totalPages} ({filteredPrices.length} data)</span>
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

        {/* MODAL: Tambah / Edit Price List + Subform Komisi per Role */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
                <div className="flex items-center gap-2.5">
                  <Tag className="h-5 w-5 text-[#F97316]" />
                  <h3 className="text-base font-bold">
                    {editItem ? 'Edit Paket Layanan & Komisi' : 'Tambah Paket Layanan Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-300 hover:bg-blue-900 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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

                {/* Nama Paket (TEKS BEBAS) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Paket Layanan *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Cuci Body + Semir, Cuci Salju + Wax Coating..."
                    value={paket}
                    onChange={(e) => setPaket(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                </div>

                {/* Tipe / Ukuran (TEKS BEBAS) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipe / Ukuran Kendaraan (Teks Bebas) *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Small, Medium, Large, Luxury, Maxi..."
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

                {/* Fasilitas */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Fasilitas / Deskripsi Pekerjaan *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber..."
                    value={fasilitas}
                    onChange={(e) => setFasilitas(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                </div>

                {/* Harga Paket */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Harga Paket (Pemisah ribuan titik, tanpa Rp) *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 50.000"
                    value={hargaInput}
                    onChange={handleHargaChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-[#0A2A5E] focus:outline-hidden focus:ring-1 focus:ring-[#0A2A5E]"
                  />
                </div>

                {/* SUB-FORM: Komisi per Role (Fleksibel: Tambah/Edit/Hapus Baris) */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-[#0A2A5E]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E]">
                        Sub-form Komisi per Role (Bisa Tambah Role Baru Kapan Saja)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRoleRow}
                      className="inline-flex items-center gap-1 rounded bg-[#0A2A5E] px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-900"
                    >
                      <Plus className="h-3 w-3" />
                      Tambah Role
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    Atur besaran komisi untuk tiap peran (washer, checker, kasir, leader, marketing, dll).
                    Nama peran adalah teks bebas.
                  </p>

                  <div className="space-y-2">
                    {rolesKomisi.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-1/2">
                          <input
                            type="text"
                            placeholder="Nama Peran (washer, checker, kasir...)"
                            value={row.peran}
                            onChange={(e) => handleRoleChange(idx, 'peran', e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
                          />
                        </div>
                        <div className="w-1/2">
                          <input
                            type="text"
                            placeholder="Nominal Komisi (misal 10.000)"
                            value={row.komisi}
                            onChange={(e) => handleRoleChange(idx, 'komisi', e.target.value)}
                            className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#0A2A5E] focus:outline-hidden"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleRow(idx)}
                          disabled={rolesKomisi.length === 1}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                          title="Hapus baris komisi ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    <span>Saran role cepat:</span>
                    {['washer', 'checker', 'kasir', 'leader', 'marketing'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          if (!rolesKomisi.some((row) => row.peran.toLowerCase() === r)) {
                            setRolesKomisi((prev) => [...prev, { peran: r, komisi: '0' }]);
                          }
                        }}
                        className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100"
                      >
                        +{r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Footer Buttons */}
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
                    {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Paket'}
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
                Apakah Anda yakin ingin menghapus paket layanan ini beserta rincian komisi per perannya?
                Tindakan ini tidak dapat dibatalkan.
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
