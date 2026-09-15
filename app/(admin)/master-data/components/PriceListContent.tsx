'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldAlert,
  Coins,
} from 'lucide-react';

interface RoleKomisiRow {
  peran: string;
  komisi: string;
}

export function PriceListContent() {
  const { hasAccess, user } = useAuth();
  const canAccess = hasAccess('spv');

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
  const [rolesKomisi, setRolesKomisi] = useState<RoleKomisiRow[]>([
    { peran: 'washer', komisi: '10.000' },
    { peran: 'checker', komisi: '5.000' },
  ]);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

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
          cleanKomisi,
          user?.id
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
          cleanKomisi,
          user?.id
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
      await deletePriceList(deleteId, user?.id);
      await loadData();
      setDeleteId(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-slate-600 mt-2">Anda tidak memiliki izin untuk mengelola Daftar Harga.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-600" />
            Daftar Harga & Komisi
          </h2>
          <p className="text-sm text-slate-500">
            Kelola katalog layanan cuci, harga standar, serta komisi per role.
          </p>
        </div>

        <button
          id="btn-tambah-paket"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
        >
          <Plus className="h-4 w-4" />
          Tambah Paket Baru
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan paket, kendaraan, tipe..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterVehicle}
            onChange={(e) => {
              setFilterVehicle(e.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          >
            <option value="ALL">Semua Jenis Kendaraan</option>
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
                <th className="px-4 py-3.5">Kendaraan</th>
                <th className="px-4 py-3.5">Paket Layanan</th>
                <th className="px-4 py-3.5">Tipe / Ukuran</th>
                <th className="px-4 py-3.5">Fasilitas</th>
                <th className="px-4 py-3.5 text-right">Harga</th>
                <th className="px-4 py-3.5">Komisi Role</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : filteredPrices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ada data harga yang cocok.
                  </td>
                </tr>
              ) : (
                filteredPrices.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#0A2A5E]">
                        {item.kendaraan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.paket}</td>
                    <td className="whitespace-nowrap px-4 py-3">
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

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs text-slate-600">
          <span>Menampilkan seluruh <strong>{filteredPrices.length}</strong> paket layanan (Dapat di-scroll langsung ke bawah)</span>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
              <h3 className="text-base font-bold">
                {editItem ? 'Edit Paket Layanan & Komisi' : 'Tambah Paket Layanan Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
                  Nama Paket Layanan *
                </label>
                <input
                  type="text"
                  value={paket}
                  onChange={(e) => setPaket(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tipe / Ukuran Kendaraan *
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
                  Fasilitas *
                </label>
                <textarea
                  rows={2}
                  value={fasilitas}
                  onChange={(e) => setFasilitas(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-[#0A2A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Harga Paket *
                </label>
                <input
                  type="text"
                  value={hargaInput}
                  onChange={handleHargaChange}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold focus:border-[#0A2A5E]"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-[#0A2A5E]">Komisi per Role</h4>
                  <button
                    type="button"
                    onClick={handleAddRoleRow}
                    className="rounded bg-[#0A2A5E] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Tambah Role
                  </button>
                </div>

                <div className="space-y-2">
                  {rolesKomisi.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Peran"
                        value={row.peran}
                        onChange={(e) => handleRoleChange(idx, 'peran', e.target.value)}
                        className="w-1/2 rounded border border-slate-300 px-3 py-1.5 text-xs focus:border-[#0A2A5E]"
                      />
                      <input
                        type="text"
                        placeholder="Nominal"
                        value={row.komisi}
                        onChange={(e) => handleRoleChange(idx, 'komisi', e.target.value)}
                        className="w-1/2 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:border-[#0A2A5E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRoleRow(idx)}
                        disabled={rolesKomisi.length === 1}
                        className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
              Apakah Anda yakin ingin menghapus paket layanan ini?
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
