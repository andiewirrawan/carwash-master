'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { resetCarwashData } from '@/lib/db';
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Lock,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  ArrowRight,
  Database,
  Users,
  Car,
  Receipt,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

export function ResetDataContent() {
  const { user, isSistemOwner } = useAuth();
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    details?: any;
  } | null>(null);

  // Access check: Exclusively for 'sistem_owner'
  if (!user || user.role !== 'sistem_owner') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 md:p-8 text-center max-w-2xl mx-auto shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Akses Terbatas: Khusus Sistem Owner</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Menu <strong>Reset Data</strong> memiliki dampak penghapusan data secara menyeluruh dan hanya dapat diakses serta dijalankan oleh akun dengan wewenang <strong>Sistem Owner</strong>.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A2A5E] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-900 transition"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = confirmInput.trim() === 'RESET DATA';

  const handleExecuteReset = async () => {
    if (!isConfirmed || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const result = await resetCarwashData({
        userId: user.id,
        confirmPhrase: confirmInput.trim(),
      });

      setSuccessResult({
        message: result.message || 'Reset data berhasil.',
        details: result.details,
      });
      setConfirmInput('');
    } catch (err: any) {
      console.error('Reset data error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses reset data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Reset Data Aplikasi</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              SISTEM OWNER ONLY
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Penghapusan seluruh data transaksi operasional, master harga, staff, dan riwayat untuk memulai sistem dari awal (clean slate).
          </p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successResult && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900">
                {successResult.message}
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                Seluruh data transaksi dan master data aplikasi telah dikosongkan. 
                Tabel akun pengguna (<strong>users</strong>) tetap utuh sehingga seluruh akun kasir, SPV, owner, dan sistem owner tetap dapat login secara normal.
              </p>

              {/* Status Checklist */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-emerald-900">
                <div className="flex items-center gap-2 bg-emerald-100/70 px-3 py-2 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Semua transaksi & operasional kosong</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100/70 px-3 py-2 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Tabel users & akun login utuh 100%</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100/70 px-3 py-2 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Master data (harga/staff/kendaraan) bersih</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100/70 px-3 py-2 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Siap untuk penginputan data baru</span>
                </div>
              </div>

              {/* Action Links after reset */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/master-data"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  <Database className="h-4 w-4" />
                  Input Master Data Baru
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/transactions"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100/50 transition"
                >
                  <Receipt className="h-4 w-4" />
                  Buka Menu Transaksi Kasir
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Box */}
      <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-5 md:p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-rose-100 p-2.5 text-rose-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900 uppercase tracking-wide">
              PERINGATAN: Seluruh data aplikasi akan dihapus dan tidak dapat dibatalkan.
            </h3>
            <p className="mt-1 text-sm text-rose-800 leading-relaxed">
              Tindakan ini akan menghapus seluruh data operasional dan master data secara permanen. Pastikan Anda telah melakukan ekspor backup data jika masih membutuhkan arsip data sebelumnya.
            </p>
          </div>
        </div>
      </div>

      {/* Scope Explanation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data yang Dihapus */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 pb-3 border-b border-slate-100">
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span>Data yang Akan Dihapus (Direset)</span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span><strong>Transaksi & Pembayaran</strong> (Aktif, Selesai, Void Log)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span><strong>Tutup Hari (Daily Closing)</strong> & Piutang Pelanggan</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span><strong>Data Pelanggan</strong> & Riwayat Perubahan Plat (Nopol)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span><strong>Absensi Staff</strong> & Riwayat Kehadiran</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span><strong>Komisi Manual</strong> & Pembagian Komisi Staff</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span><strong>Master Data</strong>: Harga Paket, Komisi, Data Staff, Multiplier, dan Kategori Kendaraan</span>
            </li>
          </ul>
        </div>

        {/* Data yang Tetap Utuh */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-blue-900 pb-3 border-b border-blue-100">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Data yang TETAP AMAN & UTUH</span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-blue-900">
            <li className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span><strong>Tabel Users</strong> (Tidak ada akun yang terhapus)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Akun <strong>Kasir / Admin</strong> tetap dapat login</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Akun <strong>Supervisor (SPV)</strong> tetap aktif</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Akun <strong>Owner & Sistem Owner</strong> tetap aktif</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Struktur database, constraint, dan skema tetap utuh</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation & Execution Card */}
      <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          Konfirmasi Penghapusan Data
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Untuk mencegah tindakan yang tidak disengaja, ketik kata sandi konfirmasi <code className="bg-rose-100 text-rose-800 font-mono font-bold px-1.5 py-0.5 rounded text-xs">RESET DATA</code> pada kolom di bawah ini:
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="confirm-reset-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ketik Konfirmasi
            </label>
            <input
              id="confirm-reset-input"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="RESET DATA"
              disabled={isLoading}
              className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-mono uppercase tracking-wider text-slate-900 focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              id="btn-execute-reset"
              onClick={handleExecuteReset}
              disabled={!isConfirmed || isLoading}
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold shadow-sm transition ${
                isConfirmed && !isLoading
                  ? 'bg-rose-600 text-white hover:bg-rose-700 cursor-pointer active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sedang Mereset Seluruh Data...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Reset Semua Data</span>
                </>
              )}
            </button>

            {confirmInput && !isConfirmed && (
              <span className="text-xs text-rose-600 font-medium animate-pulse">
                * Wajib mengetik <strong>RESET DATA</strong> dengan huruf kapital persis.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
