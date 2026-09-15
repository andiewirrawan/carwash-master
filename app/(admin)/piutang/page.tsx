'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Transaction } from '@/types/database';
import { getPiutangTransactions, markPiutangLunas } from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Car,
  Filter,
  ArrowUpDown,
  Check,
  X,
  Calendar,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function PiutangPage() {
  const { user, hasAccess } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'belum_lunas' | 'lunas'>('belum_lunas');

  // Modal Confirm Lunas
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [processingLunas, setProcessingLunas] = useState(false);
  const [lunasSuccess, setLunasSuccess] = useState('');

  const loadPiutang = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPiutangTransactions(statusFilter);
      setTransactions(data);
    } catch (err) {
      console.error('Failed loading piutang:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPiutang();
  }, [loadPiutang]);

  // KPI Calculations across all piutang
  const [allPiutang, setAllPiutang] = useState<Transaction[]>([]);
  const loadAllPiutang = useCallback(async () => {
    try {
      const res = await getPiutangTransactions('all');
      setAllPiutang(res);
    } catch (err) {
      console.error('Failed loading all piutang:', err);
    }
  }, []);

  useEffect(() => {
    loadAllPiutang();
  }, [loadAllPiutang]);

  const belumLunasList = allPiutang.filter((t) => t.status_piutang !== 'lunas');
  const lunasList = allPiutang.filter((t) => t.status_piutang === 'lunas');

  const totalNominalBelumLunas = belumLunasList.reduce((acc, t) => acc + (Number(t.harga) || 0), 0);
  const totalNominalLunas = lunasList.reduce((acc, t) => acc + (Number(t.harga) || 0), 0);
  const totalNominalAll = allPiutang.reduce((acc, t) => acc + (Number(t.harga) || 0), 0);

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.no_transaksi?.toLowerCase().includes(q) ||
      t.no_polisi?.toLowerCase().includes(q) ||
      t.customer_nama?.toLowerCase().includes(q) ||
      t.customer_hp?.toLowerCase().includes(q) ||
      t.paket_nama?.toLowerCase().includes(q)
    );
  });

  const handleConfirmLunas = async () => {
    if (!selectedTrx) return;
    setProcessingLunas(true);
    try {
      await markPiutangLunas(selectedTrx.id);
      setLunasSuccess(`Transaksi ${selectedTrx.no_transaksi} berhasil ditandai Lunas!`);
      setTimeout(async () => {
        setSelectedTrx(null);
        setLunasSuccess('');
        setProcessingLunas(false);
        await Promise.all([loadPiutang(), loadAllPiutang()]);
      }, 700);
    } catch (err) {
      console.error('Failed marking lunas:', err);
      setProcessingLunas(false);
    }
  };

  return (
    <AdminLayout>
      <div id="piutang-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 id="piutang-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
              💰 Daftar Piutang
            </h1>
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800">
              Kategori: Piutang
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Kelola transaksi kasir dengan metode bayar piutang dan pencatatan status pelunasan.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Belum Lunas */}
        <div
          id="kpi-piutang-belum-lunas"
          className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Belum Lunas (Tertunggak)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-rose-900">
            {formatRupiah(totalNominalBelumLunas)}
          </p>
          <p className="mt-1 text-xs text-rose-700 font-medium">
            {belumLunasList.length} transaksi membutuhkan pelunasan
          </p>
        </div>

        {/* Sudah Lunas */}
        <div
          id="kpi-piutang-lunas"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Sudah Lunas (Terbayar)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-emerald-900">
            {formatRupiah(totalNominalLunas)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            {lunasList.length} transaksi telah dilunasi
          </p>
        </div>

        {/* Total Keseluruhan */}
        <div
          id="kpi-piutang-total"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Seluruh Piutang
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
            {formatRupiah(totalNominalAll)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {allPiutang.length} transaksi total
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-piutang"
            type="text"
            placeholder="Cari no transaksi, nopol, nama pelanggan, paket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-[#0A2A5E] focus:bg-white focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Tabs (2 Tab Horizontal: [Belum Lunas] [Lunas]) */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
          <button
            id="tab-piutang-belum-lunas"
            onClick={() => setStatusFilter('belum_lunas')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition ${
              statusFilter === 'belum_lunas'
                ? 'bg-rose-600 font-semibold text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Belum Lunas</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                statusFilter === 'belum_lunas' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {belumLunasList.length}
            </span>
          </button>
          <button
            id="tab-piutang-lunas"
            onClick={() => setStatusFilter('lunas')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition ${
              statusFilter === 'lunas'
                ? 'bg-emerald-600 font-semibold text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Lunas</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                statusFilter === 'lunas' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {lunasList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Piutang Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table id="table-piutang" className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">No. Transaksi</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">No. Polisi</th>
                <th className="px-5 py-3.5">Customer / HP</th>
                <th className="px-5 py-3.5">Paket Layanan</th>
                <th className="px-5 py-3.5 text-right">Nominal Piutang</th>
                <th className="px-5 py-3.5 text-center">Status Piutang</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                      <span>Memuat data piutang...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Tidak ada transaksi piutang pada filter ini</p>
                      <p className="text-xs text-slate-400">
                        Semua tagihan terkelola atau filter pencarian tidak menemukan hasil.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isLunas = t.status_piutang === 'lunas';
                  const dateStr = formatDateID(t.tanggal);
                  const lunasDateStr = t.tanggal_lunas
                    ? formatDateID(t.tanggal_lunas.split('T')[0])
                    : null;

                  return (
                    <tr
                      key={t.id}
                      id={`piutang-row-${t.id}`}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isLunas ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      {/* No Transaksi */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {t.no_transaksi}
                      </td>

                      {/* Tanggal */}
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <span>{dateStr}</span>
                        {t.waktu && <span className="text-slate-400"> &bull; {t.waktu.substring(0, 5)}</span>}
                      </td>

                      {/* No Polisi */}
                      <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-800 border border-slate-200">
                          {t.no_polisi}
                        </span>
                      </td>

                      {/* Customer / HP */}
                      <td className="px-5 py-4 text-slate-800">
                        <div className="font-medium text-sm">
                          {t.customer_nama || <span className="text-slate-400 italic">Customer</span>}
                        </div>
                        {t.customer_hp && t.customer_hp !== '-' && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{t.customer_hp}</span>
                          </div>
                        )}
                      </td>

                      {/* Paket */}
                      <td className="px-5 py-4 text-slate-700">
                        <div className="font-medium">{t.paket_nama}</div>
                        <div className="text-xs text-slate-400">{t.kendaraan} &bull; {t.tipe}</div>
                      </td>

                      {/* Nominal */}
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(t.harga)}
                      </td>

                      {/* Status Piutang */}
                      <td className="px-5 py-4 text-center">
                        {isLunas ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                              <Check className="h-3 w-3" />
                              Lunas
                            </span>
                            {lunasDateStr && (
                              <span className="mt-0.5 text-[10px] text-slate-400 font-mono">
                                {lunasDateStr}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                            <Clock className="h-3 w-3" />
                            Belum Lunas
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-center">
                        {!isLunas ? (
                          <button
                            id={`btn-tandai-lunas-${t.id}`}
                            onClick={() => setSelectedTrx(t)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Tandai Lunas</span>
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span>Menampilkan {filteredTransactions.length} transaksi piutang</span>
          <span>Semua nominal disajikan dalam format ribuan titik tanpa Rp</span>
        </div>
      </div>

      {/* Modal Konfirmasi Pelunasan */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Pelunasan Piutang</h3>
              </div>
              <button
                onClick={() => setSelectedTrx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {lunasSuccess && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{lunasSuccess}</span>
                </div>
              )}

              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menandai transaksi berikut sebagai <strong>LUNAS</strong>?
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Transaksi:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTrx.no_transaksi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Polisi:</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedTrx.no_polisi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium text-slate-900">{selectedTrx.customer_nama || 'Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paket:</span>
                  <span className="font-medium text-slate-900">{selectedTrx.paket_nama}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-700">Nominal Tagihan:</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">
                    {formatRupiah(selectedTrx.harga)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrx(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-pelunasan"
                  type="button"
                  disabled={processingLunas}
                  onClick={handleConfirmLunas}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processingLunas ? 'Memproses...' : 'Ya, Tandai Lunas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
