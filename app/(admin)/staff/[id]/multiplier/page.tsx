'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { Staff, StaffKomisiMultiplier } from '@/types/database';
import {
  getStaffList,
  getStaffMultipliers,
  addStaffMultiplier,
  getEffectiveMultiplierForDate,
} from '@/lib/db';
import { formatDate, toInputDate } from '@/lib/format';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Percent,
  Plus,
  ArrowLeft,
  Calendar,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export default function StaffMultiplierPage() {
  const routeParams = useParams();
  const rawId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const staffId = rawId ? parseInt(rawId, 10) : NaN;

  const { user, hasAccess } = useAuth();
  const canEdit = hasAccess('admin');

  const [staff, setStaff] = useState<Staff | null>(null);
  const [multipliers, setMultipliers] = useState<StaffKomisiMultiplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [multiplierVal, setMultiplierVal] = useState<string>('10');
  const [berlakuMulai, setBerlakuMulai] = useState<string>(toInputDate('2026-12-01'));
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Demo test date calculation
  const [testDateInput, setTestDateInput] = useState<string>(toInputDate(new Date()));
  const [effectiveTestResult, setEffectiveTestResult] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const staffAll = await getStaffList();
    const currentStaff = staffAll.find((s) => s.id === staffId);
    setStaff(currentStaff || null);

    const mults = await getStaffMultipliers(staffId);
    setMultipliers(mults);

    const eff = await getEffectiveMultiplierForDate(staffId, testDateInput);
    setEffectiveTestResult(eff);

    setLoading(false);
  }, [staffId, testDateInput]);

  useEffect(() => {
    if (!isNaN(staffId)) {
      loadData();
    }
  }, [staffId, loadData]);

  const handleTestDateChange = async (dateStr: string) => {
    setTestDateInput(dateStr);
    const eff = await getEffectiveMultiplierForDate(staffId, dateStr);
    setEffectiveTestResult(eff);
  };

  const handleAddMultiplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const multNum = parseFloat(multiplierVal);
    if (isNaN(multNum) || multNum < 0) {
      setFormError('Multiplier persen harus berupa angka positif (0 atau lebih).');
      return;
    }

    if (!berlakuMulai) {
      setFormError('Tanggal berlaku mulai wajib dipilih.');
      return;
    }

    setSaving(true);
    try {
      await addStaffMultiplier({
        staff_id: staffId,
        multiplier: multNum,
        berlaku_mulai: berlakuMulai,
        dientry_oleh: user?.id || null,
        dientry_oleh_nama: user ? `${user.nama} (${user.role})` : 'System',
        created_at: new Date().toISOString(),
      });

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError('Gagal menyimpan riwayat komisi multiplier.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
            <span>Memuat riwayat multiplier staff...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!staff) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-bold text-base">Data Staff Tidak Ditemukan</p>
          <Link
            href="/staff"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] underline"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Data Staff
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header & Breadcrumb Back */}
        <div>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0A2A5E] mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Data Staff
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
                <Percent className="h-6 w-6 text-[#F97316]" />
                Riwayat Komisi Multiplier — {staff.nama}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Role Staff: <span className="font-bold capitalize text-slate-800">{staff.role}</span> | Status:{' '}
                <span className={staff.aktif ? 'text-emerald-600 font-bold' : 'text-slate-400 font-bold'}>
                  {staff.aktif ? 'Aktif' : 'Non-Aktif'}
                </span>
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  setFormError('');
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none transition-all"
              >
                <Plus className="h-4 w-4" />
                Tambah Multiplier Baru
              </button>
            )}
          </div>
        </div>

        {/* Explanation Banner based on prompt requirement */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-xs text-xs text-slate-700 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#0A2A5E]">
            <Info className="h-4 w-4 text-[#F97316]" />
            Aturan Perhitungan Effective Multiplier:
          </div>
          <p className="text-slate-600 leading-relaxed">
            Saat hitung komisi transaksi tanggal X, sistem mengambil baris multiplier staff dengan{' '}
            <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-700 font-bold">
              berlaku_mulai &lt;= X
            </code>
            , diurutkan paling baru. Riwayat lama <strong className="text-slate-900">TIDAK dihapus/ditimpa</strong> agar transaksi lama tetap kehitung pakai multiplier saat itu (contoh: Topa 0% sebelum Des 2026, lalu +10% mulai Des 2026 dan seterusnya).
          </p>
        </div>

        {/* Interactive Effective Date Simulator Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Simulasi Cek Multiplier Efektif per Tanggal Transaksi
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-700">Tanggal Transaksi:</label>
              <input
                type="date"
                value={testDateInput}
                onChange={(e) => handleTestDateChange(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-[#F97316] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-indigo-900 font-bold">
              <span>Multiplier Berlaku (Tgl {formatDate(testDateInput)}):</span>
              <span className="text-sm text-[#F97316]">+{effectiveTestResult}%</span>
            </div>
          </div>
        </div>

        {/* Timeline / Table History */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0A2A5E] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#F97316]" />
              Daftar History Multiplier ({multipliers.length} Baris)
            </h3>
            <span className="text-xs text-slate-500">Format Tanggal: dd/mm/yyyy</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5">Multiplier (% Tambahan)</th>
                  <th className="px-4 py-3.5">Berlaku Mulai (dd/mm/yyyy)</th>
                  <th className="px-4 py-3.5">Dientry Oleh</th>
                  <th className="px-4 py-3.5">Waktu Di-entry</th>
                  <th className="px-4 py-3.5 text-center">Status Relevansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {multipliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Belum ada riwayat komisi multiplier untuk staff ini.
                    </td>
                  </tr>
                ) : (
                  multipliers.map((m, idx) => {
                    const isLatestEffective = idx === 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[#0A2A5E] text-sm">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-800 border border-indigo-100">
                            +{m.multiplier}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">
                          {formatDate(m.berlaku_mulai)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {m.dientry_oleh_nama || 'System'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                          {formatDate(m.created_at)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isLatestEffective ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Check className="h-3 w-3" /> Paling Baru (Terpakai)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                              Riwayat Historis
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
        </div>

        {/* Modal Form: Add Multiplier */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E]">
                  Tambah Multiplier Baru — {staff.nama}
                </h3>
              </div>

              {formError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddMultiplier} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Multiplier (% Tambahan)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      placeholder="Contoh: 10 untuk +10%"
                      value={multiplierVal}
                      onChange={(e) => setMultiplierVal(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2.5 pl-3 pr-8 text-sm font-bold text-slate-900 focus:border-[#F97316] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 font-bold text-slate-400">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Contoh: 0 = tanpa tambahan, 10 = +10% dari komisi standar.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Berlaku Mulai Tanggal (Efektif)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={berlakuMulai}
                      onChange={(e) => setBerlakuMulai(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 font-semibold focus:border-[#F97316] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sistem akan otomatis memformat tampilan tanggal sebagai{' '}
                    <span className="font-bold text-slate-700">{formatDate(berlakuMulai)}</span>.
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-900 border border-amber-200">
                  <span className="font-bold">Catatan Penting:</span> Riwayat multiplier lama tidak akan dihapus atau ditimpa, menjaga keakuratan histori komisi transaksi sebelumnya.
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
                        <span>Simpan Baris Baru</span>
                      </>
                    )}
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
