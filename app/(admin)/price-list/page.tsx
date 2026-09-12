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
} from 'lucide-react';

export default function PriceListPage() {
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('admin');

  const [prices, setPrices] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterVehicle, setFilterVehicle] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<PriceList | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states
  const [kendaraan, setKendaraan] = useState<string>('Mobil');
  const [paket, setPaket] = useState<string>('');
  const [fasilitas, setFasilitas] = useState<string>('');
  const [tipe, setTipe] = useState<string>('Medium');
  const [hargaInput, setHargaInput] = useState<string>('');
  const [komisiWasherInput, setKomisiWasherInput] = useState<string>('');
  const [komisiCheckerInput, setKomisiCheckerInput] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
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
    setKomisiWasherInput('');
    setKomisiCheckerInput('');
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
    setKomisiWasherInput(formatNominal(item.komisi_washer));
    setKomisiCheckerInput(formatNominal(item.komisi_checker));
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!paket.trim()) {
      setFormError('Nama Paket Wajib Diisi.');
      return;
    }
    if (!fasilitas.trim()) {
      setFormError('Fasilitas Wajib Diisi.');
      return;
    }

    const hargaNum = parseNominal(hargaInput);
    if (isNaN(hargaNum) || hargaNum <= 0) {
      setFormError('Harga Paket Harus Berupa Angka Lebih Dari 0.');
      return;
    }

    const washerNum = parseNominal(komisiWasherInput);
    const checkerNum = parseNominal(komisiCheckerInput);

    setSaving(true);
    try {
      if (editItem) {
        await updatePriceList(editItem.id, {
          kendaraan,
          paket,
          fasilitas,
          tipe,
          harga: hargaNum,
          komisi_washer: washerNum,
          komisi_checker: checkerNum,
        });
      } else {
        await addPriceList({
          kendaraan,
          paket,
          fasilitas,
          tipe,
          harga: hargaNum,
          komisi_washer: washerNum,
          komisi_checker: checkerNum,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError('Gagal menyimpan data ke database.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await deletePriceList(deleteId);
    setDeleteId(null);
    await loadData();
  };

  // Filter & Search Logic
  const filteredPrices = useMemo(() => {
    return prices.filter((item) => {
      const matchSearch =
        item.paket.toLowerCase().includes(search.toLowerCase()) ||
        item.fasilitas.toLowerCase().includes(search.toLowerCase()) ||
        item.kendaraan.toLowerCase().includes(search.toLowerCase()) ||
        item.tipe.toLowerCase().includes(search.toLowerCase());

      const matchVehicle = filterVehicle === 'ALL' || item.kendaraan === filterVehicle;

      return matchSearch && matchVehicle;
    });
  }, [prices, search, filterVehicle]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredPrices.length / pageSize));
  const paginatedPrices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPrices.slice(start, start + pageSize);
  }, [filteredPrices, currentPage, pageSize]);

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
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
              <Tag className="h-6 w-6 text-[#F97316]" />
              CRUD Price List (Daftar Harga)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola daftar paket cuci, fasilitas, tipe kendaraan, harga (titik ribuan, tanpa &quot;Rp&quot;), dan alokasi komisi.
            </p>
          </div>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] transition-all"
            >
              <Plus className="h-4 w-4" />
              Tambah Price List Baru
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari paket, fasilitas, tipe..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:outline-none"
            />
          </div>

          {/* Vehicle Category Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Filter:</span>
            <select
              value={filterVehicle}
              onChange={(e) => {
                setFilterVehicle(e.target.value);
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
              {/* Table Header: Dark Blue #0A2A5E with White Text */}
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5">Kendaraan</th>
                  <th className="px-4 py-3.5">Nama Paket</th>
                  <th className="px-4 py-3.5">Fasilitas & Layanan</th>
                  <th className="px-4 py-3.5">Tipe</th>
                  <th className="px-4 py-3.5 text-right">Harga (tanpa Rp)</th>
                  <th className="px-4 py-3.5 text-right">Komisi Washer</th>
                  <th className="px-4 py-3.5 text-right">Komisi Checker</th>
                  {canEdit && <th className="px-4 py-3.5 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                        <span>Memuat data price list...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPrices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data price list yang sesuai.
                    </td>
                  </tr>
                ) : (
                  paginatedPrices.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-medium text-slate-500">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.kendaraan === 'Mobil'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.kendaraan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#0A2A5E]">{item.paket}</td>
                      <td className="px-4 py-3 max-w-xs text-slate-600 truncate" title={item.fasilitas}>
                        {item.fasilitas}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {item.tipe}
                        </span>
                      </td>
                      {/* Price Nominal: Formatted with thousand dots, strictly without "Rp" */}
                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                        {formatNominal(item.harga)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                        {formatNominal(item.komisi_washer)}
                      </td>
                      <td className="px-4 py-3 text-right text-indigo-700 font-semibold">
                        {formatNominal(item.komisi_checker)}
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

          {/* Simple Pagination Bar (Bottom Left: Page number + Go button) */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Halaman <span className="font-bold text-slate-900">{currentPage}</span> dari{' '}
                <span className="font-bold text-slate-900">{totalPages}</span> (Total{' '}
                {filteredPrices.length} data)
              </span>

              {/* Jump to Page Form */}
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

            {/* Pagination Nav Buttons */}
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

        {/* Modal Form: Add / Edit Price List */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E]">
                  {editItem ? 'Edit Price List' : 'Tambah Price List Baru'}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kendaraan</label>
                    <select
                      value={kendaraan}
                      onChange={(e) => setKendaraan(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-[#F97316] focus:outline-none"
                    >
                      <option value="Mobil">Mobil</option>
                      <option value="Motor">Motor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipe</label>
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
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Paket</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Cuci Body + Semir / Cuci Salju Wax"
                    value={paket}
                    onChange={(e) => setPaket(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fasilitas & Layanan</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Shampoo Snow, Vacuum Kabin, Semir Ban, Lap Microfiber"
                    value={fasilitas}
                    onChange={(e) => setFasilitas(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Harga Paket (tanpa &quot;Rp&quot;, otomatis format ribuan)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 200000 -> tampil 200.000"
                    value={hargaInput}
                    onChange={(e) => {
                      const num = parseNominal(e.target.value);
                      setHargaInput(num > 0 ? formatNominal(num) : e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Komisi Washer</label>
                    <input
                      type="text"
                      placeholder="Contoh: 10.000"
                      value={komisiWasherInput}
                      onChange={(e) => {
                        const num = parseNominal(e.target.value);
                        setKomisiWasherInput(num > 0 ? formatNominal(num) : e.target.value);
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-emerald-800 font-semibold focus:border-[#F97316] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Komisi Checker</label>
                    <input
                      type="text"
                      placeholder="Contoh: 5.000"
                      value={komisiCheckerInput}
                      onChange={(e) => {
                        const num = parseNominal(e.target.value);
                        setKomisiCheckerInput(num > 0 ? formatNominal(num) : e.target.value);
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-indigo-800 font-semibold focus:border-[#F97316] focus:outline-none"
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

        {/* Modal Confirm Delete */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus item price list ini dari database?
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
