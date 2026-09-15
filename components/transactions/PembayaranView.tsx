'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getTransactions,
  completeTransactionPayment,
  isDayClosedForCashier,
} from '@/lib/db';
import { Transaction } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { formatNominal, formatDate } from '@/lib/format';
import {
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  X,
  Search,
  RefreshCw,
  Users,
  Car,
  Receipt,
  ArrowRight,
} from 'lucide-react';

interface PembayaranViewProps {
  onNavigateStep?: (step: 'riwayat-hari-ini' | 'sedang-dikerjakan' | 'mobil-masuk') => void;
  preSelectedTrxId?: number;
}

export function PembayaranView({ onNavigateStep, preSelectedTrxId }: PembayaranViewProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterWasherStatus, setFilterWasherStatus] = useState<'all' | 'ready' | 'no-washer'>('all');

  // Payment Modal
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [metodeBayar, setMetodeBayar] = useState<'Tunai' | 'Non Tunai'>('Tunai');
  const [keteranganBayar, setKeteranganBayar] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Digital Receipt Modal
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactions({ status: 'aktif', status_pengerjaan: 'proses' });
      setTransactions(data);
    } catch (err) {
      console.error('Failed loading pembayaran list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pre-select transaction if passed
  useEffect(() => {
    if (preSelectedTrxId && transactions.length > 0 && !selectedTrx) {
      const target = transactions.find((t) => t.id === preSelectedTrxId);
      if (target) {
        setSelectedTrx(target);
      }
    }
  }, [preSelectedTrxId, transactions, selectedTrx]);

  const openPaymentModal = (trx: Transaction) => {
    setSelectedTrx(trx);
    setMetodeBayar('Tunai');
    setKeteranganBayar('');
  };

  const closePaymentModal = () => {
    setSelectedTrx(null);
    setKeteranganBayar('');
  };

  const handleConfirmPayment = async () => {
    if (!selectedTrx) return;

    const hasWashers = (selectedTrx.staff_assigned || []).some((s) => s.peran === 'washer');
    if (!hasWashers) {
      const confirmProceed = window.confirm(
        '⚠️ PERINGATAN: Mobil ini BELUM memiliki washer yang ditugaskan!\n\nKomisi washer tidak akan tercatat untuk transaksi ini jika dilanjutkan tanpa washer.\n\nApakah Anda tetap ingin menyelesaikan pembayaran?'
      );
      if (!confirmProceed) return;
    }

    setIsSubmittingPayment(true);
    try {
      const updated = await completeTransactionPayment({
        transactionId: selectedTrx.id,
        metode_bayar: metodeBayar,
        keterangan: keteranganBayar.trim() || undefined,
      });

      // Prepare receipt view
      setReceiptTrx({
        ...selectedTrx,
        metode_bayar: metodeBayar,
        status_pengerjaan: 'selesai',
        waktu_selesai: updated.waktu_selesai || new Date().toISOString(),
      });

      closePaymentModal();
      await loadData();
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(`Gagal memproses pembayaran: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Filter list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Washer status filter
      const hasWashers = (t.staff_assigned || []).some((s) => s.peran === 'washer');
      if (filterWasherStatus === 'ready' && !hasWashers) return false;
      if (filterWasherStatus === 'no-washer' && hasWashers) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNopol = t.no_polisi?.toLowerCase().includes(q);
        const matchCust = t.customer_nama?.toLowerCase().includes(q);
        const matchCode = t.no_transaksi?.toLowerCase().includes(q);
        return matchNopol || matchCust || matchCode;
      }

      return true;
    });
  }, [transactions, filterWasherStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
              3
            </div>
            <h2 className="text-lg font-bold text-slate-900">Kasir Pembayaran</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {transactions.length} Menunggu Pembayaran
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 ml-9">
            Pilih metode pembayaran (Tunai atau Non Tunai) lalu selesaikan transaksi dan cetak struk.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-pembayaran"
              type="text"
              placeholder="Cari Plat / Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <button
            id="btn-refresh-pembayaran"
            type="button"
            onClick={loadData}
            title="Muat Ulang"
            className="p-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="btn-filter-pembayaran-all"
          type="button"
          onClick={() => setFilterWasherStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterWasherStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua ({transactions.length})
        </button>

        <button
          id="btn-filter-pembayaran-ready"
          type="button"
          onClick={() => setFilterWasherStatus('ready')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterWasherStatus === 'ready'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Siap Bayar (Ada Washer)
        </button>

        <button
          id="btn-filter-pembayaran-nowasher"
          type="button"
          onClick={() => setFilterWasherStatus('no-washer')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterWasherStatus === 'no-washer'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Belum Ada Washer
        </button>
      </div>

      {/* Empty State */}
      {!loading && filteredTransactions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Semua Tagihan Selesai</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
            Tidak ada transaksi cuci yang sedang menunggu pembayaran saat ini.
          </p>
        </div>
      )}

      {/* List of Transactions Ready for Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTransactions.map((trx) => {
          const washers = (trx.staff_assigned || []).filter((s) => s.peran === 'washer');
          const hasWashers = washers.length > 0;

          return (
            <div
              key={trx.id}
              id={`card-bayar-${trx.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 tracking-wider">
                      {trx.no_transaksi}
                    </span>
                    <h3 className="text-xl font-mono font-black text-slate-900 tracking-wide mt-0.5">
                      {trx.no_polisi}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-600 block">Total Tagihan</span>
                    <span className="text-base font-black text-blue-700">
                      Rp {formatNominal(trx.harga)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="py-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pelanggan:</span>
                    <span className="font-bold text-slate-800">
                      {trx.customer_nama} ({trx.customer_tier || 'Reguler'})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">Layanan:</span>
                    <span className="font-bold text-slate-800">
                      {trx.paket_nama} &bull; {trx.tipe}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">Jam Masuk:</span>
                    <span className="font-semibold text-slate-700">{trx.waktu || '-'}</span>
                  </div>

                  {/* Staff Info */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                      Washer Bertugas:
                    </span>
                    {hasWashers ? (
                      <div className="flex flex-wrap gap-1">
                        {washers.map((w, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            🚿 {w.staff_nama}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Belum ada washer</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  id={`btn-open-pay-${trx.id}`}
                  type="button"
                  onClick={() => openPaymentModal(trx)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Proses Pembayaran</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAYMENT MODAL */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Kasir Pembayaran
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {selectedTrx.no_polisi} &bull; {selectedTrx.no_transaksi}
                </h3>
              </div>

              <button
                id="btn-close-payment-modal"
                type="button"
                onClick={closePaymentModal}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Total Tagihan Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-center">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  TOTAL TAGIHAN PEMBAYARAN
                </p>
                <h2 className="text-3xl font-black text-slate-900 mt-1">
                  Rp {formatNominal(selectedTrx.harga)}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  {selectedTrx.paket_nama} &bull; {selectedTrx.tipe} &bull; Pelanggan:{' '}
                  <strong>{selectedTrx.customer_nama}</strong>
                </p>
              </div>

              {/* Washer warning if none */}
              {!(selectedTrx.staff_assigned || []).some((s) => s.peran === 'washer') && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Belum Ada Washer Terdaftar</p>
                    <p className="text-amber-700 mt-0.5">
                      Sebaiknya tugaskan washer di menu &quot;Sedang Dikerjakan&quot; terlebih dahulu agar pembagian komisi terhitung.
                    </p>
                  </div>
                </div>
              )}

              {/* PAYMENT METHOD SELECTOR: HANYA 2 PILIHAN (TUNAI & NON TUNAI) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">
                  PILIH METODE PEMBAYARAN <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Tunai */}
                  <button
                    id="btn-method-tunai"
                    type="button"
                    onClick={() => setMetodeBayar('Tunai')}
                    className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                      metodeBayar === 'Tunai'
                        ? 'bg-emerald-50/90 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        metodeBayar === 'Tunai' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Tunai</p>
                      <p className="text-xs text-slate-500 mt-0.5">Pembayaran menggunakan uang cash</p>
                    </div>
                  </button>

                  {/* 2. Non Tunai */}
                  <button
                    id="btn-method-nontunai"
                    type="button"
                    onClick={() => setMetodeBayar('Non Tunai')}
                    className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                      metodeBayar === 'Non Tunai'
                        ? 'bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        metodeBayar === 'Non Tunai' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Non Tunai</p>
                      <p className="text-xs text-slate-500 mt-0.5">QRIS, transfer, & pembayaran digital</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  id="input-keterangan-bayar"
                  type="text"
                  placeholder="Contoh: No ref QRIS 998124, Diskon HUT, dll."
                  value={keteranganBayar}
                  onChange={(e) => setKeteranganBayar(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-payment"
                type="button"
                onClick={closePaymentModal}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <button
                id="btn-confirm-payment"
                type="button"
                disabled={isSubmittingPayment}
                onClick={handleConfirmPayment}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingPayment ? 'Memproses...' : 'Konfirmasi Selesai Bayar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL RECEIPT MODAL */}
      {receiptTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">Pembayaran Berhasil!</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Transaksi telah dicatat dan masuk ke omzet hari ini.
                </p>
              </div>

              {/* Receipt Body */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-xs space-y-2">
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <p className="font-bold text-sm text-slate-900">BSA CAR WASH</p>
                  <p className="text-[10px] text-slate-600">Struk Pembayaran Cuci</p>
                </div>

                <div className="space-y-1 text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span>No. Trx:</span>
                    <span className="font-bold">{receiptTrx.no_transaksi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{receiptTrx.tanggal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plat Nomor:</span>
                    <span className="font-bold text-slate-900">{receiptTrx.no_polisi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span>{receiptTrx.customer_nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Layanan:</span>
                    <span>{receiptTrx.paket_nama} ({receiptTrx.tipe})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metode:</span>
                    <span className="font-bold uppercase text-blue-700">
                      {receiptTrx.metode_bayar}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-xs text-slate-900">
                  <span>TOTAL BAYAR:</span>
                  <span>Rp {formatNominal(receiptTrx.harga)}</span>
                </div>

                <div className="text-center pt-2 text-[10px] text-slate-600">
                  Terima kasih atas kunjungan Anda!
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  id="btn-print-receipt"
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Struk</span>
                </button>

                <button
                  id="btn-done-receipt"
                  type="button"
                  onClick={() => {
                    setReceiptTrx(null);
                    onNavigateStep?.('riwayat-hari-ini');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <span>Selesai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
