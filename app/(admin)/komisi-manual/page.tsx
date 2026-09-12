'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, KomisiManual } from '@/types/database';
import { getStaffList, getKomisiManual, addKomisiManual } from '@/lib/db';
import { formatNominal, parseNominal, formatDate } from '@/lib/format';
import { Award, Plus, Calendar, DollarSign, Users, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function KomisiManualPage() {
  const { user } = useAuth();
  const isOwnerOrSystemOwner = user?.role === 'owner' || user?.role === 'sistem_owner';

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [komisiList, setKomisiList] = useState<KomisiManual[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Form states
  const [staffId, setStaffId] = useState<number | ''>('');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState<string>('');
  const [nominalInput, setNominalInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [staffData, komisiData] = await Promise.all([
      getStaffList(),
      getKomisiManual(),
    ]);
    setStaffList(staffData.filter((s) => s.aktif));
    setKomisiList(komisiData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!staffId) {
      setErrorMsg('Silakan pilih staff penerima komisi.');
      return;
    }
    if (!keterangan.trim()) {
      setErrorMsg('Keterangan komisi / bonus wajib diisi.');
      return;
    }
    const nominal = parseNominal(nominalInput);
    if (nominal <= 0) {
      setErrorMsg('Nominal komisi harus lebih besar dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      await addKomisiManual({
        staff_id: Number(staffId),
        tanggal,
        keterangan: keterangan.trim(),
        nominal,
        dientry_oleh: user?.id || null,
        dientry_oleh_nama: user?.nama || 'Owner',
        created_at: new Date().toISOString(),
      });

      setSuccessMsg('Komisi manual / bonus berhasil ditambahkan.');
      setKeterangan('');
      setNominalInput('');
      setStaffId('');
      loadData();
    } catch (err) {
      setErrorMsg('Gagal menyimpan komisi manual.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredKomisi = useMemo(() => {
    return komisiList.filter((k) =>
      k.keterangan.toLowerCase().includes(search.toLowerCase()) ||
      (k.staff_nama || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [komisiList, search]);

  if (!isOwnerOrSystemOwner) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600 mb-2" />
          <h2 className="text-base font-bold">Akses Dibatasi</h2>
          <p className="text-xs mt-1">Halaman Komisi Manual hanya dapat diakses oleh Owner & Sistem Owner.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
              <Award className="h-6 w-6 text-[#F97316]" />
              Komisi Manual & Bonus Tambahan
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Input komisi di luar rumus otomatis price_list (kerjaan tambahan karpet/jok, bonus harian, dll).
            </p>
          </div>
        </div>

        {/* Input Form Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-[#0A2A5E] mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#F97316]" />
            Form Tambah Komisi / Bonus Manual
          </h2>

          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Staff Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Staff</label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-800 focus:border-[#F97316] focus:outline-none"
                required
              >
                <option value="">-- Pilih Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-800 focus:border-[#F97316] focus:outline-none"
                required
              />
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Jenis Bonus</label>
              <input
                type="text"
                placeholder="Contoh: Cuci Karpet Extra / Bonus Harian"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:outline-none"
                required
              />
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal (tanpa Rp)</label>
              <input
                type="text"
                placeholder="50.000"
                value={nominalInput ? formatNominal(nominalInput) : ''}
                onChange={(e) => setNominalInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-[#F97316] focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] transition-all disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Simpan Komisi Manual'}
              </button>
            </div>
          </form>
        </div>

        {/* List Table Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-[#0A2A5E]">Riwayat Komisi Manual / Bonus</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari keterangan atau staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Nama Staff</th>
                  <th className="px-4 py-3">Keterangan / Jenis Bonus</th>
                  <th className="px-4 py-3 text-right">Nominal (tanpa Rp)</th>
                  <th className="px-4 py-3 text-center">Dientry Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Memuat data komisi manual...
                    </td>
                  </tr>
                ) : filteredKomisi.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Belum ada riwayat komisi manual.
                    </td>
                  </tr>
                ) : (
                  filteredKomisi.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-600">{formatDate(item.tanggal)}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{item.staff_nama || `Staff #${item.staff_id}`}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{item.keterangan}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#F97316] text-sm">
                        {formatNominal(item.nominal)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 text-[11px]">
                        {item.dientry_oleh_nama || 'Owner'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
