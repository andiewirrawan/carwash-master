'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getPiutangTransactions, markPiutangLunas } from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import { Transaction } from '@/types/database';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Check,
  X,
} from 'lucide-react';

export function PiutangContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'belum_lunas' | 'lunas'>('belum_lunas');
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [processingLunas, setProcessingLunas] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPiutangTransactions(statusFilter);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmLunas = async () => {
    if (!selectedTrx) return;
    setProcessingLunas(true);
    try {
      await markPiutangLunas(selectedTrx.id);
      setSelectedTrx(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingLunas(false);
    }
  };

  const filtered = transactions.filter(t => 
    t.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.customer_nama?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
          <button
            onClick={() => setStatusFilter('belum_lunas')}
            className={`px-4 py-2 rounded-lg transition ${statusFilter === 'belum_lunas' ? 'bg-rose-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Belum Lunas
          </button>
          <button
            onClick={() => setStatusFilter('lunas')}
            className={`px-4 py-2 rounded-lg transition ${statusFilter === 'lunas' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Sudah Lunas
          </button>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nopol atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Transaksi</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Layanan</th>
                <th className="px-5 py-4 text-right">Nominal</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">Tidak ada piutang ditemukan.</td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{t.no_transaksi}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">{formatDateID(t.tanggal)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{t.no_polisi}</p>
                      <p className="text-xs text-slate-500">{t.customer_nama || 'Customer'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{t.paket_nama}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">{formatRupiah(t.harga)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${t.status_piutang === 'lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {t.status_piutang === 'lunas' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {t.status_piutang === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {t.status_piutang !== 'lunas' && (
                        <button
                          onClick={() => setSelectedTrx(t)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                        >
                          Tandai Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Pelunasan</h3>
            <p className="text-sm text-slate-600 mb-6">
              Tandai transaksi <span className="font-bold text-[#0A2A5E]">{selectedTrx.no_transaksi}</span> ({selectedTrx.no_polisi}) sebagai LUNAS?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTrx(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                disabled={processingLunas}
                onClick={handleConfirmLunas}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
              >
                {processingLunas ? 'Memproses...' : 'Ya, Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
