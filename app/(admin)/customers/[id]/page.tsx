'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Customer, Transaction, NopolHistory } from '@/types/database';
import {
  getCustomerById,
  updateCustomer,
  gantiNopol,
  getNopolHistory,
  getCustomerTransactions,
} from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import {
  ArrowLeft,
  Users,
  Car,
  Phone,
  Crown,
  Award,
  History,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Receipt,
  X,
  AlertTriangle,
  RefreshCw,
  Save,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasAccess } = useAuth();

  const customerId = Number(params?.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nopolHistories, setNopolHistories] = useState<NopolHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNama, setEditNama] = useState('');
  const [editHp, setEditHp] = useState('');
  const [editKendaraan, setEditKendaraan] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Modal Ganti Nopol State
  const [showGantiNopolModal, setShowGantiNopolModal] = useState(false);
  const [newNopolInput, setNewNopolInput] = useState('');
  const [gantiError, setGantiError] = useState('');
  const [gantiSuccess, setGantiSuccess] = useState('');
  const [submittingGanti, setSubmittingGanti] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cust, trxs, hist] = await Promise.all([
        getCustomerById(customerId),
        getCustomerTransactions(customerId),
        getNopolHistory(customerId),
      ]);
      setCustomer(cust);
      if (cust) {
        setEditNama(cust.nama || '');
        setEditHp(cust.hp || '');
        setEditKendaraan(cust.kendaraan || 'Mobil');
      }
      setTransactions(trxs);
      setNopolHistories(hist);
    } catch (err) {
      console.error('Error loading customer detail:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId, loadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSavingProfile(true);
    try {
      await updateCustomer(customer.id, {
        nama: editNama.trim() || undefined,
        hp: editHp.trim() || undefined,
        kendaraan: editKendaraan || 'Mobil',
      });
      setIsEditingProfile(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update customer:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGantiNopolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setGantiError('');
    setGantiSuccess('');

    // Format regex: HURUF spasi ANGKA spasi HURUF
    const cleanNopol = newNopolInput.trim().toUpperCase().replace(/\s+/g, ' ');
    const nopolRegex = /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/i;

    if (!nopolRegex.test(cleanNopol)) {
      setGantiError('Format plat nomor harus berupa: HURUF spasi ANGKA spasi HURUF (contoh: B 1234 BSA, D 5678 XYZ)');
      return;
    }

    setSubmittingGanti(true);
    try {
      const res = await gantiNopol(
        customer.id,
        cleanNopol,
        user?.id || null,
        user ? `${user.nama} (${user.role})` : undefined
      );

      if (!res.success) {
        setGantiError(res.error || 'Gagal mengubah plat nomor');
        setSubmittingGanti(false);
        return;
      }

      setGantiSuccess(`Plat nomor berhasil diubah ke ${cleanNopol}. Intensitas kunjungan tetap tersambung.`);
      setTimeout(async () => {
        setShowGantiNopolModal(false);
        setNewNopolInput('');
        setGantiSuccess('');
        setSubmittingGanti(false);
        await loadData();
      }, 1200);
    } catch (err: any) {
      setGantiError(err?.message || 'Terjadi kesalahan sistem.');
      setSubmittingGanti(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0A2A5E] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Memuat rincian customer...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-900">Customer Tidak Ditemukan</h2>
        <p className="mt-1 text-sm text-slate-500">ID Customer #{customerId} tidak terdaftar di database.</p>
        <Link
          href="/customers"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0A2A5E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#08224d]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Customer</span>
        </Link>
      </div>
    );
  }

  const isGold = customer.tier === 'gold' || (customer.total_kunjungan || 0) >= 50;

  return (
    <AdminLayout>
      <div id="customer-detail-page" className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            id="btn-back-to-customers"
            href="/customers"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 id="customer-detail-nopol" className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                {customer.nopol}
              </h1>
              {isGold ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                  <Crown className="h-3.5 w-3.5 text-amber-600" />
                  Tier Gold
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Tier Reguler
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Customer ID #{customer.id} &bull; Terdaftar sejak{' '}
              {customer.created_at ? formatDateID(customer.created_at.split('T')[0]) : '-'}
            </p>
          </div>
        </div>

        {/* Action: Ganti Nopol (admin and up) */}
        <div className="flex items-center gap-3">
          {hasAccess('admin') && (
            <button
              id="btn-open-ganti-nopol"
              onClick={() => {
                setGantiError('');
                setGantiSuccess('');
                setNewNopolInput('');
                setShowGantiNopolModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-orange-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Ganti Plat Nomor</span>
            </button>
          )}
        </div>
      </div>

      {/* Customer Info Card & Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Profil Pelanggan</h2>
            {!isEditingProfile ? (
              <button
                id="btn-edit-profile"
                onClick={() => setIsEditingProfile(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A2A5E] hover:underline"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Ubah</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Batal
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nama Lengkap
                </span>
                <span className="mt-0.5 block font-medium text-slate-900">
                  {customer.nama || <span className="text-slate-400 italic">Belum diisi</span>}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nomor HP (WhatsApp)
                </span>
                <span className="mt-0.5 flex items-center gap-2 font-medium text-slate-900">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {customer.hp || <span className="text-slate-400 italic">Belum diisi</span>}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Jenis Kendaraan
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <Car className="h-3.5 w-3.5 text-slate-500" />
                  {customer.kendaraan || 'Mobil'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Plat Nomor Aktif
                </span>
                <span className="mt-0.5 inline-block font-mono text-base font-bold text-[#0A2A5E]">
                  {customer.nopol}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Nama</label>
                <input
                  id="input-edit-nama"
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A2A5E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">No. HP</label>
                <input
                  id="input-edit-hp"
                  type="text"
                  value={editHp}
                  onChange={(e) => setEditHp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A2A5E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Kendaraan</label>
                <select
                  id="select-edit-kendaraan"
                  value={editKendaraan}
                  onChange={(e) => setEditKendaraan(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#0A2A5E] focus:outline-hidden"
                >
                  <option value="Mobil">Mobil</option>
                  <option value="Motor">Motor</option>
                </select>
              </div>

              <button
                id="btn-save-profile"
                type="submit"
                disabled={savingProfile}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A2A5E] py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#08224d]"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Lifetime Statistics */}
        <div className="flex flex-col justify-between gap-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Visits Card */}
            <div id="card-total-kunjungan-aktif" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Kunjungan Aktif
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0A2A5E]">
                  <History className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {customer.total_kunjungan || 0}
                <span className="ml-1 text-sm font-normal text-slate-500">kali</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tersambung ke ID customer (tidak reset saat ganti plat)
              </p>
            </div>

            {/* Total Lifetime Omzet Card */}
            <div id="card-total-omzet-customer" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Omzet
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold text-slate-900">
                {formatRupiah(customer.total_omzet || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Format ribuan titik, tanpa Rp
              </p>
            </div>
          </div>

          {/* Tier Status Alert */}
          <div
            className={`rounded-2xl border p-4.5 text-sm ${
              isGold
                ? 'border-amber-200 bg-amber-50/60 text-amber-900'
                : 'border-blue-100 bg-blue-50/50 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {isGold ? (
                <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              ) : (
                <Award className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              )}
              <div>
                <p className="font-semibold">
                  {isGold
                    ? 'Pelanggan Setia: Tier Gold Aktif'
                    : `Menuju Tier Gold: ${50 - (customer.total_kunjungan || 0)} kunjungan lagi`}
                </p>
                <p className="mt-0.5 text-xs opacity-85">
                  {isGold
                    ? 'Customer telah mencapai 50+ kunjungan aktif. Riwayat plat nomor dan data transaksi tersimpan terpusat.'
                    : 'Customer otomatis naik ke status Gold setelah mencapai minimal 50 kunjungan berstatus aktif.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Ganti Nopol (Section 2 & 3 User Requirement) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-5 w-5 text-orange-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Riwayat Ganti Plat Nomor</h2>
              <p className="text-xs text-slate-500">
                Daftar pergantian nopol beserta snapshot intensitas kunjungan saat pergantian terjadi
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
            {nopolHistories.length} perubahan
          </span>
        </div>

        {nopolHistories.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Car className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Belum ada riwayat ganti nopol</p>
            <p className="text-xs text-slate-400">
              Customer ini masih menggunakan plat asli pertama yang didaftarkan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="table-nopol-history" className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Tanggal & Waktu Ubah</th>
                  <th className="px-6 py-3.5">Plat Lama (Berhenti Aktif)</th>
                  <th className="px-6 py-3.5">Plat Baru (Aktif)</th>
                  <th className="px-6 py-3.5 text-center">Intensitas Saat Pindah</th>
                  <th className="px-6 py-3.5">Diubah Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nopolHistories.map((h) => {
                  const dateStr = h.tanggal_ubah ? formatDateID(h.tanggal_ubah.split('T')[0]) : '-';
                  const timeStr = h.tanggal_ubah && h.tanggal_ubah.includes('T')
                    ? h.tanggal_ubah.split('T')[1].substring(0, 5)
                    : '';
                  return (
                    <tr key={h.id} id={`nopol-history-row-${h.id}`} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                        <span>{dateStr}</span> {timeStr && <span className="text-slate-400">&bull; {timeStr}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600 line-through border border-slate-200">
                          {h.nopol_lama}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 border border-emerald-200">
                          {h.nopol_baru}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-[#0A2A5E]">
                          {h.intensitas_saat_pindah}x kunjungan
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {h.diubah_oleh_nama || 'Admin / Sistem'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Riwayat Transaksi Customer */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Receipt className="h-5 w-5 text-[#0A2A5E]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Riwayat Transaksi Cuci</h2>
              <p className="text-xs text-slate-500">
                Semua transaksi customer di BSA Car Wash (mencakup seluruh plat nopol lama & baru)
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
            {transactions.length} transaksi
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Receipt className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Belum ada transaksi</p>
            <p className="text-xs text-slate-400">
              Transaksi yang dilakukan di kasir akan otomatis tampil di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="table-customer-transactions" className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">No. Transaksi</th>
                  <th className="px-6 py-3.5">Tanggal & Waktu</th>
                  <th className="px-6 py-3.5">Plat Dipakai</th>
                  <th className="px-6 py-3.5">Paket Layanan</th>
                  <th className="px-6 py-3.5 text-right">Harga</th>
                  <th className="px-6 py-3.5 text-center">Metode Bayar</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isVoid = t.status === 'void';
                  const dateStr = formatDateID(t.tanggal);
                  const isCurrentPlate = t.no_polisi?.toUpperCase() === customer.nopol.toUpperCase();

                  return (
                    <tr
                      key={t.id}
                      id={`trx-row-${t.id}`}
                      className={`transition-colors ${isVoid ? 'bg-rose-50/40 text-slate-400 line-through' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* No Transaksi */}
                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {t.no_transaksi}
                      </td>

                      {/* Tanggal & Waktu */}
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <span>{dateStr}</span>
                        {t.waktu && <span className="text-slate-400"> &bull; {t.waktu.substring(0, 5)}</span>}
                      </td>

                      {/* Plat */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 font-mono text-xs font-bold border ${
                            isCurrentPlate
                              ? 'bg-blue-50 text-[#0A2A5E] border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {t.no_polisi}
                          {!isCurrentPlate && (
                            <span className="ml-1 text-[10px] font-normal text-amber-600">(Plat Lama)</span>
                          )}
                        </span>
                      </td>

                      {/* Paket Layanan */}
                      <td className="px-6 py-4 text-slate-800">
                        <div className="font-medium">{t.paket_nama}</div>
                        <div className="text-xs text-slate-400">{t.kendaraan} &bull; {t.tipe}</div>
                      </td>

                      {/* Harga */}
                      <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(t.harga)}
                      </td>

                      {/* Metode Bayar */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            t.metode_bayar === 'Tunai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.metode_bayar === 'Qris'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.metode_bayar}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {isVoid ? (
                          <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                            VOID
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Aktif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ganti Nopol (Admin & Up) */}
      {showGantiNopolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">Ganti Nomor Polisi</h3>
              </div>
              <button
                onClick={() => setShowGantiNopolModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGantiNopolSubmit} className="mt-4 space-y-4">
              {/* Alert notice */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                <p className="font-bold">Ketentuan Ganti Plat:</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  <li>Total intensitas kunjungan ({customer.total_kunjungan || 0}x) <strong>TIDAK di-reset</strong> ke 0.</li>
                  <li>Snapshot riwayat akan dicatat di tabel <code>nopol_history</code>.</li>
                  <li>Plat lama ({customer.nopol}) otomatis berhenti aktif untuk transaksi baru.</li>
                </ul>
              </div>

              {gantiError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>{gantiError}</span>
                </div>
              )}

              {gantiSuccess && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{gantiSuccess}</span>
                </div>
              )}

              {/* Current Plat */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Plat Nomor Saat Ini (Lama)
                </label>
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-600">
                  {customer.nopol}
                </div>
              </div>

              {/* New Plat Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Plat Nomor Baru (Wajib)
                </label>
                <input
                  id="input-new-nopol"
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: B 5678 NEW"
                  value={newNopolInput}
                  onChange={(e) => setNewNopolInput(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-base font-bold uppercase tracking-wider text-slate-900 focus:border-orange-600 focus:bg-white focus:outline-hidden"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Format: HURUF spasi ANGKA spasi HURUF (contoh: B 5678 NEW, D 8899 XYZ)
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGantiNopolModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-ganti-nopol"
                  type="submit"
                  disabled={submittingGanti}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
                >
                  {submittingGanti ? 'Menyimpan...' : 'Konfirmasi Ganti Plat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
