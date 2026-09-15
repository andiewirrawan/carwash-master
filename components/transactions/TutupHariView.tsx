'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getKasirClosingPreview,
  createDailyClosing,
  reopenDailyClosing,
  getDailyClosingList,
} from '@/lib/db';
import { DailyClosing, Transaction } from '@/types/database';
import { formatNominal, formatDate } from '@/lib/format';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  Banknote,
  QrCode,
  Gift,
  CreditCard,
  UserCheck,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export function TutupHariView() {
  const { user } = useAuth();
  const isOwnerOrSystemOwner = user?.role === 'owner' || user?.role === 'sistem_owner';
  const isSPV = user?.role === 'spv';

  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmIgnoredUnpaid, setConfirmIgnoredUnpaid] = useState<boolean>(false);

  // Cashier preview state
  const [preview, setPreview] = useState<{
    total_selesai: number;
    total_omzet: number;
    breakdown: { Tunai: number; NonTunai?: number; Qris: number; Promo: number; Piutang: number; Lainnya: number };
    transaksi_proses: Transaction[];
    sudah_tutup: boolean;
    closing_info: DailyClosing | null;
  }>({
    total_selesai: 0,
    total_omzet: 0,
    breakdown: { Tunai: 0, NonTunai: 0, Qris: 0, Promo: 0, Piutang: 0, Lainnya: 0 },
    transaksi_proses: [],
    sudah_tutup: false,
    closing_info: null,
  });

  // Owner / SPV recap list
  const [closingList, setClosingList] = useState<DailyClosing[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const p = await getKasirClosingPreview(tanggal, user.id);
      setPreview(p);

      if (isOwnerOrSystemOwner || isSPV) {
        const list = await getDailyClosingList(tanggal);
        setClosingList(list);
      }
    } catch (err) {
      console.error('Failed loading daily closing data:', err);
    } finally {
      setLoading(false);
    }
  }, [tanggal, user, isOwnerOrSystemOwner, isSPV]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit Daily Closing
  const handleConfirmClose = async () => {
    if (!user?.id) return;

    if (preview.transaksi_proses.length > 0 && !confirmIgnoredUnpaid) {
      alert('Masih ada mobil yang belum selesai/dibayar. Mohon centang konfirmasi jika mobil tersebut memang menginap.');
      return;
    }

    const conf = window.confirm(
      `Apakah Anda yakin ingin menutup hari untuk tanggal ${tanggal}?\n\nTotal Transaksi Selesai: ${preview.total_selesai}\nTotal Omzet: Rp ${formatNominal(preview.total_omzet)}\n\nSetelah ditutup, seluruh transaksi hari ini akan dikunci.`
    );
    if (!conf) return;

    setIsSubmitting(true);
    try {
      await createDailyClosing({
        tanggal,
        kasir_id: user.id,
        total_transaksi: preview.total_selesai,
        total_omzet: preview.total_omzet,
      });

      await loadData();
      alert('Tutup Hari berhasil dicatat! Transaksi Anda telah dikunci.');
    } catch (err: any) {
      console.error('Failed to create daily closing:', err);
      alert(`Gagal menutup hari: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reopen shift (SPV / Owner only)
  const handleReopen = async (closingId: number) => {
    const conf = window.confirm(
      'Apakah Anda yakin ingin membuka kembali shift ini? Kasir akan dapat mengubah/menambah transaksi lagi.'
    );
    if (!conf) return;

    try {
      await reopenDailyClosing(closingId);
      await loadData();
      alert('Shift berhasil dibuka kembali.');
    } catch (err: any) {
      console.error('Failed to reopen daily closing:', err);
      alert(`Gagal membuka kembali: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Tutup Hari (Daily Closing)</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 ml-9">
            Tutup shift kasir di akhir hari, rekonsiliasi total omzet, dan kunci catatan transaksi harian.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-date-closing"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <button
            id="btn-refresh-closing"
            type="button"
            onClick={loadData}
            title="Muat Ulang"
            className="p-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* STATUS BANNER (ALREADY CLOSED OR OPEN) */}
      {preview.sudah_tutup ? (
        <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500/30 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Shift Hari Ini Telah Ditutup
              </p>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                Ditutup Pada: {preview.closing_info?.ditutup_pada ? new Date(preview.closing_info.ditutup_pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Petugas Kasir: <strong>{preview.closing_info?.kasir_nama || user?.nama}</strong> &bull; Seluruh transaksi pada tanggal ini terkunci.
              </p>
            </div>
          </div>

          {(isOwnerOrSystemOwner || isSPV) && preview.closing_info && (
            <button
              id="btn-reopen-shift"
              type="button"
              onClick={() => handleReopen(preview.closing_info!.id)}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <Unlock className="w-4 h-4 text-emerald-600" />
              <span>Buka Ulang Shift (Owner/SPV)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 flex items-start gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">Shift Kasir Masih Aktif</h3>
            <p className="text-xs text-blue-700 mt-0.5">
              Kasir bertugas: <strong>{user?.nama}</strong>. Lakukan penutupan shift di akhir hari setelah seluruh mobil selesai dicuci dan dibayar.
            </p>
          </div>
        </div>
      )}

      {/* PREVIEW SUMMARY CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Preview Rekap Kasir ({tanggal})
          </h3>
          <span className="text-xs font-bold text-slate-700">
            Kasir: {user?.nama || 'Petugas'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 uppercase block">
                Jumlah Mobil Dicuci (Selesai)
              </span>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {preview.total_selesai}{' '}
                <span className="text-sm font-bold text-slate-600">Unit</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
              <span className="text-[11px] font-bold text-blue-700 uppercase block">
                Total Omzet Terkumpul
              </span>
              <p className="text-3xl font-black text-blue-900 mt-1">
                Rp {formatNominal(preview.total_omzet)}
              </p>
            </div>
          </div>

          {/* Breakdown per Payment Method */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-3">
              Rincian Per Metode Pembayaran
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tunai */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Tunai (Cash)</span>
                </div>
                <p className="text-lg font-black text-slate-900 mt-1">
                  Rp {formatNominal(preview.breakdown.Tunai)}
                </p>
              </div>

              {/* Non Tunai */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Non Tunai (QRIS / Transfer / Digital)</span>
                </div>
                <p className="text-lg font-black text-slate-900 mt-1">
                  Rp {formatNominal(preview.breakdown.NonTunai ?? preview.breakdown.Qris ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {/* WARNING: UNFINISHED / UNPAID TRANSACTIONS */}
          {preview.transaksi_proses.length > 0 && !preview.sudah_tutup && (
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Peringatan: Masih Ada {preview.transaksi_proses.length} Kendaraan Belum Selesai / Belum Bayar
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Harap selesaikan proses cuci dan pembayaran terlebih dahulu jika memungkinkan.
                  </p>
                </div>
              </div>

              {/* List of unfinished cars */}
              <div className="bg-white/80 rounded-lg p-3 border border-amber-200 space-y-1.5 max-h-40 overflow-y-auto">
                {preview.transaksi_proses.map((t) => (
                  <div key={t.id} className="flex justify-between text-xs py-1 border-b border-amber-100 last:border-0">
                    <span className="font-mono font-bold text-slate-900">{t.no_polisi}</span>
                    <span className="text-slate-600">{t.customer_nama} &bull; {t.paket_nama}</span>
                    <span className="font-bold text-amber-700">Rp {formatNominal(t.harga)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="checkbox-confirm-unpaid"
                  type="checkbox"
                  checked={confirmIgnoredUnpaid}
                  onChange={(e) => setConfirmIgnoredUnpaid(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                />
                <label htmlFor="checkbox-confirm-unpaid" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Saya mengonfirmasi bahwa kendaraan di atas memang menginap / belum dibayar, dan ingin tetap menutup shift.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!preview.sudah_tutup && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              id="btn-confirm-tutup-hari"
              type="button"
              disabled={isSubmitting || (preview.transaksi_proses.length > 0 && !confirmIgnoredUnpaid)}
              onClick={handleConfirmClose}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center gap-2 shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses Tutup Hari...' : 'Konfirmasi Tutup Hari Ini'}</span>
            </button>
          </div>
        )}
      </div>

      {/* OWNER / SPV RECAP TABLE (ALL CASHIERS) */}
      {(isOwnerOrSystemOwner || isSPV) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Daftar Closing Seluruh Kasir (Audit SPV / Owner)
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Kasir</th>
                  <th className="p-3.5">Waktu Ditutup</th>
                  <th className="p-3.5 text-center">Total Unit</th>
                  <th className="p-3.5 text-right">Total Omzet</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-600 italic">
                      Belum ada kasir yang melakukan Tutup Hari pada tanggal ini.
                    </td>
                  </tr>
                ) : (
                  closingList.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-800">{c.tanggal}</td>
                      <td className="p-3.5 font-semibold text-slate-700">{c.kasir_nama}</td>
                      <td className="p-3.5 text-slate-600">
                        {c.ditutup_pada
                          ? new Date(c.ditutup_pada).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-900">
                        {c.total_transaksi} unit
                      </td>
                      <td className="p-3.5 text-right font-black text-blue-700">
                        Rp {formatNominal(c.total_omzet)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleReopen(c.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                        >
                          Buka Ulang
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
