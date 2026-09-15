'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Customer } from '@/types/database';
import { getCustomers, gantiNopol } from '@/lib/db';
import {
  RefreshCw,
  Search,
  Car,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export function GantiNopolContent() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newNopolInput, setNewNopolInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.nopol.toLowerCase().includes(q) ||
      (c.nama && c.nama.toLowerCase().includes(q))
    );
  }).slice(0, 10); // Limit results for this quick action

  const handleGantiNopol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError('');
    setSuccess('');

    const cleanNopol = newNopolInput.trim().toUpperCase().replace(/\s+/g, ' ');
    const nopolRegex = /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/i;

    if (!nopolRegex.test(cleanNopol)) {
      setError('Format plat nomor harus: HURUF spasi ANGKA spasi HURUF (contoh: B 1234 BSA)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await gantiNopol(
        selectedCustomer.id,
        cleanNopol,
        user?.id || null,
        user ? `${user.nama} (${user.role})` : undefined
      );

      if (!res.success) {
        setError(res.error || 'Gagal mengubah plat nomor');
        return;
      }

      setSuccess(`Plat nomor berhasil diubah ke ${cleanNopol}`);
      setTimeout(() => {
        setSelectedCustomer(null);
        setNewNopolInput('');
        setSuccess('');
        loadData();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5 shadow-xs flex items-start gap-4">
        <RefreshCw className="h-6 w-6 text-orange-600 shrink-0 mt-1" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Fitur Ganti Plat Nomor (Snapshot)</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Gunakan fitur ini jika pelanggan mengganti plat nomor kendaraannya. 
            <strong> Total kunjungan TIDAK akan reset</strong>. Sistem akan mencatat riwayat plat lama sebagai snapshot 
            dan menyambungkan kunjungan ke plat baru.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Plat Nomor atau Nama Pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-sm font-medium text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Memuat data...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">Tidak ada customer yang ditemukan.</div>
          ) : (
            filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 transition hover:border-orange-200 hover:bg-orange-50/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-600 border border-slate-200">
                    {c.nopol.split(' ')[0]}
                  </div>
                  <div>
                    <h4 className="font-mono text-sm font-bold text-slate-900">{c.nopol}</h4>
                    <p className="text-xs text-slate-500">{c.nama || 'Tanpa Nama'} &bull; {c.total_kunjungan || 0}x kunjungan</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(c)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
                >
                  Pilih <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Ganti Plat Nomor</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-blue-50 p-3.5 text-xs text-blue-900 border border-blue-100">
              Customer: <strong>{selectedCustomer.nama || 'Tanpa Nama'}</strong><br/>
              Kunjungan: <strong>{selectedCustomer.total_kunjungan || 0}x</strong><br/>
              Plat Lama: <strong className="font-mono">{selectedCustomer.nopol}</strong>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleGantiNopol} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Input Plat Nomor Baru *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: B 1234 BSA"
                  value={newNopolInput}
                  onChange={(e) => setNewNopolInput(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base font-bold uppercase tracking-widest text-slate-900 focus:border-orange-600 focus:outline-hidden"
                />
                <p className="mt-1.5 text-[10px] text-slate-400">Gunakan spasi antar blok huruf dan angka.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
