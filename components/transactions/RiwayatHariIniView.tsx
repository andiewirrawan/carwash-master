'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getTransactions,
  updateTransaction,
  voidTransaction,
  isDayClosedForCashier,
  getPriceList,
} from '@/lib/db';
import { Transaction, PriceList } from '@/types/database';
import { formatNominal, formatDate } from '@/lib/format';
import {
  History,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  Calendar,
  AlertTriangle,
  Lock,
  Edit2,
  X,
  ShieldAlert,
  RefreshCw,
  Info,
  DollarSign,
  Car,
} from 'lucide-react';

export function RiwayatHariIniView() {
  const { user } = useAuth();
  const isOwnerOrSystemOwner = user?.role === 'owner' || user?.role === 'sistem_owner';
  const isSPV = user?.role === 'spv';

  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<PriceList[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selesai' | 'proses' | 'void'>('all');
  const [isCashierClosed, setIsCashierClosed] = useState<boolean>(false);

  // Void Modal
  const [voidTargetTrx, setVoidTargetTrx] = useState<Transaction | null>(null);
  const [voidAlasan, setVoidAlasan] = useState<string>('');
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  // Edit Modal
  const [editTrx, setEditTrx] = useState<Transaction | null>(null);
  const [editCustomerNama, setEditCustomerNama] = useState<string>('');
  const [editCustomerHp, setEditCustomerHp] = useState<string>('');
  const [editPriceId, setEditPriceId] = useState<number>(0);
  const [editHarga, setEditHarga] = useState<number>(0);
  const [editMetodeBayar, setEditMetodeBayar] = useState<string>('');
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTrx, pList] = await Promise.all([
        getTransactions({ startDate: tanggal, endDate: tanggal }),
        getPriceList(),
      ]);

      setTransactions(allTrx);
      setPrices(pList);

      if (user?.id) {
        const closed = await isDayClosedForCashier(tanggal, user.id);
        setIsCashierClosed(closed);
      }
    } catch (err) {
      console.error('Failed loading riwayat hari ini:', err);
    } finally {
      setLoading(false);
    }
  }, [tanggal, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Totals & Metrics
  const metrics = useMemo(() => {
    const activeList = transactions.filter((t) => t.status === 'aktif');
    const selesaiList = activeList.filter((t) => t.status_pengerjaan === 'selesai');
    const prosesList = activeList.filter((t) => t.status_pengerjaan === 'proses');
    const voidList = transactions.filter((t) => t.status === 'void');

    const totalOmzet = selesaiList.reduce((acc, cur) => acc + Number(cur.harga || 0), 0);

    return {
      total: transactions.length,
      selesai: selesaiList.length,
      proses: prosesList.length,
      void: voidList.length,
      omzet: totalOmzet,
    };
  }, [transactions]);

  // Open Edit Modal
  const handleOpenEdit = (trx: Transaction) => {
    // Check if locked
    if (isCashierClosed && !isOwnerOrSystemOwner && !isSPV) {
      alert('Transaksi pada tanggal ini sudah ditutup. Hanya SPV atau Owner yang dapat mengedit.');
      return;
    }

    if (trx.status === 'void') {
      alert('Transaksi yang telah di-void tidak dapat diedit.');
      return;
    }

    setEditTrx(trx);
    setEditCustomerNama(trx.customer_nama || '');
    setEditCustomerHp(trx.customer_hp || '');
    setEditPriceId(trx.price_list_id || 0);
    setEditHarga(Number(trx.harga || 0));
    setEditMetodeBayar(trx.metode_bayar || 'Tunai');
    setEditKeterangan(trx.keterangan || '');
  };

  const handlePriceChangeInEdit = (newPriceId: number) => {
    setEditPriceId(newPriceId);
    const found = prices.find((p) => p.id === newPriceId);
    if (found) {
      setEditHarga(Number(found.harga));
    }
  };

  const handleSaveEdit = async () => {
    if (!editTrx) return;

    setIsSavingEdit(true);
    try {
      await updateTransaction(editTrx.id, {
        price_list_id: editPriceId,
        harga: editHarga,
        metode_bayar: editMetodeBayar,
        keterangan: editKeterangan,
      });

      await loadData();
      setEditTrx(null);
    } catch (err: any) {
      console.error('Failed to update transaction:', err);
      alert(`Gagal memperbarui transaksi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Void Handler (Owner Only)
  const handleConfirmVoid = async () => {
    if (!voidTargetTrx) return;

    if (!voidAlasan.trim()) {
      alert('Alasan pembatalan (void) wajib diisi!');
      return;
    }

    if (!user?.id) {
      alert('Sesi user tidak valid. Silakan login ulang.');
      return;
    }

    setIsVoiding(true);
    try {
      await voidTransaction(voidTargetTrx.id, voidAlasan.trim(), user.id);
      await loadData();
      setVoidTargetTrx(null);
      setVoidAlasan('');
    } catch (err: any) {
      console.error('Failed to void transaction:', err);
      alert(`Gagal void transaksi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsVoiding(false);
    }
  };

  // Filter list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter === 'selesai' && (t.status !== 'aktif' || t.status_pengerjaan !== 'selesai')) {
        return false;
      }
      if (statusFilter === 'proses' && (t.status !== 'aktif' || t.status_pengerjaan !== 'proses')) {
        return false;
      }
      if (statusFilter === 'void' && t.status !== 'void') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNopol = t.no_polisi?.toLowerCase().includes(q);
        const matchCust = t.customer_nama?.toLowerCase().includes(q);
        const matchCode = t.no_transaksi?.toLowerCase().includes(q);
        return matchNopol || matchCust || matchCode;
      }

      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-black">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Riwayat Transaksi Hari Ini</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 ml-9">
            Lihat daftar transaksi, koreksi kesalahan input, atau void transaksi (khusus Owner).
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-date-riwayat"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <button
            id="btn-refresh-riwayat"
            type="button"
            onClick={loadData}
            title="Muat Ulang Data"
            className="p-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-600 uppercase">Total Transaksi</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Semua status hari ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-700 uppercase">Cuci Selesai</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.selesai}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Sudah dibayar</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase">Sedang Proses</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{metrics.proses}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Belum selesai/bayar</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-blue-700 uppercase">Omzet Hari Ini</p>
          <p className="text-2xl font-black text-blue-700 mt-1">
            Rp {formatNominal(metrics.omzet)}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">Total transaksi selesai</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            id="filter-riwayat-all"
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({metrics.total})
          </button>

          <button
            id="filter-riwayat-selesai"
            type="button"
            onClick={() => setStatusFilter('selesai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
              statusFilter === 'selesai'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Selesai ({metrics.selesai})
          </button>

          <button
            id="filter-riwayat-proses"
            type="button"
            onClick={() => setStatusFilter('proses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
              statusFilter === 'proses'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Proses ({metrics.proses})
          </button>

          <button
            id="filter-riwayat-void"
            type="button"
            onClick={() => setStatusFilter('void')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
              statusFilter === 'void'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Void ({metrics.void})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-riwayat"
            type="text"
            placeholder="Cari Plat / Nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">No. Transaksi</th>
                <th className="p-3.5">Plat Nomor</th>
                <th className="p-3.5">Pelanggan</th>
                <th className="p-3.5">Layanan</th>
                <th className="p-3.5 text-right">Harga</th>
                <th className="p-3.5">Metode Bayar</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Kasir</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-600 italic">
                    Tidak ada transaksi yang cocok untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => {
                  const isVoid = trx.status === 'void';
                  const isSelesai = trx.status === 'aktif' && trx.status_pengerjaan === 'selesai';

                  return (
                    <tr
                      key={trx.id}
                      id={`row-riwayat-${trx.id}`}
                      className={`hover:bg-slate-50/70 transition ${
                        isVoid ? 'bg-red-50/40 text-slate-600' : ''
                      }`}
                    >
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {trx.waktu || '-'}
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {trx.no_transaksi}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {trx.no_polisi}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{trx.customer_nama}</span>
                        {trx.customer_tier === 'gold' && (
                          <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            GOLD
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">{trx.paket_nama}</span>{' '}
                        <span className="text-slate-600">({trx.tipe})</span>
                      </td>

                      <td className="p-3.5 text-right font-black whitespace-nowrap">
                        {isVoid ? (
                          <span className="line-through text-slate-600">
                            Rp {formatNominal(trx.harga)}
                          </span>
                        ) : (
                          <span className="text-slate-900">Rp {formatNominal(trx.harga)}</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {trx.metode_bayar ? (
                          <span className="font-bold uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {trx.metode_bayar}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">Belum Bayar</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {isVoid ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                            <Ban className="w-3 h-3" />
                            <span>VOID</span>
                          </div>
                        ) : isSelesai ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Selesai</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            <span>Proses</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {trx.kasir_nama || 'Kasir'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          {!isVoid && (
                            <button
                              id={`btn-edit-trx-${trx.id}`}
                              type="button"
                              onClick={() => handleOpenEdit(trx)}
                              title="Edit Transaksi"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Void Button (Owner / Sistem Owner Only) */}
                          {isOwnerOrSystemOwner && !isVoid && (
                            <button
                              id={`btn-void-trx-${trx.id}`}
                              type="button"
                              onClick={() => {
                                setVoidTargetTrx(trx);
                                setVoidAlasan('');
                              }}
                              title="Void Transaksi (Khusus Owner)"
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Koreksi Transaksi Hari Ini
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {editTrx.no_polisi} &bull; {editTrx.no_transaksi}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditTrx(null)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Paket / Layanan</label>
                <select
                  value={editPriceId}
                  onChange={(e) => handlePriceChangeInEdit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  {prices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kendaraan} &bull; {p.paket} &bull; {p.tipe} (Rp {formatNominal(p.harga)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Transaksi (Rp)</label>
                <input
                  type="number"
                  value={editHarga}
                  onChange={(e) => setEditHarga(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Metode Bayar</label>
                <select
                  value={editMetodeBayar}
                  onChange={(e) => setEditMetodeBayar(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="Qris">Qris</option>
                  <option value="Promo">Promo</option>
                  <option value="Piutang">Piutang</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTrx(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOID MODAL (OWNER ONLY) */}
      {voidTargetTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-red-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-900 font-black">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span>Konfirmasi Void Transaksi</span>
              </div>
              <button
                type="button"
                onClick={() => setVoidTargetTrx(null)}
                className="p-1 rounded-lg text-slate-600 hover:bg-red-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Anda akan membatalkan transaksi{' '}
                <strong className="text-slate-900">
                  {voidTargetTrx.no_transaksi} ({voidTargetTrx.no_polisi})
                </strong>{' '}
                senilai{' '}
                <strong className="text-red-700">Rp {formatNominal(voidTargetTrx.harga)}</strong>.
                Transaksi yang di-void akan dikeluarkan dari total omzet dan komisi washer, serta
                tercatat permanen di log audit.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  ALASAN VOID TRANSAKSI <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="textarea-alasan-void"
                  required
                  rows={3}
                  placeholder="Contoh: Customer komplain cuci batal sebelum dimulai, atau salah input dobel transaksi."
                  value={voidAlasan}
                  onChange={(e) => setVoidAlasan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidTargetTrx(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                id="btn-confirm-void-action"
                type="button"
                disabled={isVoiding || !voidAlasan.trim()}
                onClick={handleConfirmVoid}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs"
              >
                {isVoiding ? 'Memproses...' : 'Ya, Void Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
