'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Customer } from '@/types/database';
import { getCustomers } from '@/lib/db';
import { formatRupiah, formatDateID } from '@/lib/format';
import {
  Users,
  Search,
  ArrowUpDown,
  Car,
  Award,
  Crown,
  History,
  Phone,
  Filter,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function CustomersPage() {
  const { user, hasAccess } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'reguler' | 'gold'>('all');
  const [sortBy, setSortBy] = useState<'kunjungan' | 'omzet' | 'nama' | 'nopol'>('kunjungan');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filter and sort
  const filteredCustomers = customers
    .filter((c) => {
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.nopol.toLowerCase().includes(q) ||
        (c.nama && c.nama.toLowerCase().includes(q)) ||
        (c.hp && c.hp.toLowerCase().includes(q)) ||
        (c.kendaraan && c.kendaraan.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'kunjungan') {
        comparison = (a.total_kunjungan || 0) - (b.total_kunjungan || 0);
      } else if (sortBy === 'omzet') {
        comparison = (a.total_omzet || 0) - (b.total_omzet || 0);
      } else if (sortBy === 'nama') {
        comparison = (a.nama || '').localeCompare(b.nama || '');
      } else if (sortBy === 'nopol') {
        comparison = a.nopol.localeCompare(b.nopol);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Summary Metrics
  const totalCustomers = customers.length;
  const totalGold = customers.filter((c) => c.tier === 'gold').length;
  const totalKunjungan = customers.reduce((acc, c) => acc + (c.total_kunjungan || 0), 0);
  const totalOmzet = customers.reduce((acc, c) => acc + (c.total_omzet || 0), 0);

  return (
    <AdminLayout>
      <div id="customers-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 id="customers-header-title" className="text-2xl font-bold tracking-tight text-slate-900">
            Data Customer
          </h1>
          <p className="text-sm text-slate-500">
            Kelola data pelanggan BSA Car Wash, riwayat kunjungan aktif, dan status tier loyalitas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2 text-xs text-blue-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A2A5E]" />
            <span>Customer otomatis tersimpan saat kasir input transaksi</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Customers */}
        <div id="kpi-total-customers" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Customer</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0A2A5E]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{totalCustomers}</p>
          <p className="mt-1 text-xs text-slate-500">Pelanggan terdaftar di sistem</p>
        </div>

        {/* Customer Gold */}
        <div id="kpi-gold-customers" className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Customer Gold</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Crown className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-900">{totalGold}</p>
          <p className="mt-1 text-xs text-amber-700">Kunjungan aktif &ge; 50 kali</p>
        </div>

        {/* Total Kunjungan Aktif */}
        <div id="kpi-total-kunjungan" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Kunjungan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <History className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{totalKunjungan}x</p>
          <p className="mt-1 text-xs text-slate-500">Transaksi berstatus aktif</p>
        </div>

        {/* Total Omzet Customer */}
        <div id="kpi-total-omzet" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Omzet</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Car className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatRupiah(totalOmzet)}</p>
          <p className="mt-1 text-xs text-slate-500">Format ribuan titik, tanpa Rp</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-customer"
            type="text"
            placeholder="Cari berdasarkan nopol (contoh: B 1234 BSA), nama, atau nomor HP..."
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Tier Filter Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              id="filter-tier-all"
              onClick={() => setTierFilter('all')}
              className={`rounded-lg px-3 py-1.5 transition ${
                tierFilter === 'all'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Tier
            </button>
            <button
              id="filter-tier-reguler"
              onClick={() => setTierFilter('reguler')}
              className={`rounded-lg px-3 py-1.5 transition ${
                tierFilter === 'reguler'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reguler
            </button>
            <button
              id="filter-tier-gold"
              onClick={() => setTierFilter('gold')}
              className={`rounded-lg px-3 py-1.5 transition ${
                tierFilter === 'gold'
                  ? 'bg-amber-500 font-semibold text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              Gold (&ge;50)
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <span className="text-slate-400">Urut:</span>
            <select
              id="select-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="font-medium text-slate-800 focus:outline-hidden"
            >
              <option value="kunjungan">Kunjungan</option>
              <option value="omzet">Omzet</option>
              <option value="nama">Nama</option>
              <option value="nopol">Plat Nomor</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-0.5 text-slate-400 hover:text-slate-700"
              title={`Urut ${sortOrder === 'desc' ? 'Terbesar ke Terkecil' : 'Terkecil ke Terbesar'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table id="table-customers" className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">No. Polisi</th>
                <th className="px-5 py-3.5">Nama Customer</th>
                <th className="px-5 py-3.5">No. HP</th>
                <th className="px-5 py-3.5">Kendaraan</th>
                <th className="px-5 py-3.5 text-center">Total Kunjungan</th>
                <th className="px-5 py-3.5 text-right">Total Omzet</th>
                <th className="px-5 py-3.5 text-center">Status Tier</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                      <span>Memuat data customer...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Tidak ada data customer yang cocok</p>
                      <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter tier.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isGold = c.tier === 'gold' || (c.total_kunjungan || 0) >= 50;
                  return (
                    <tr
                      key={c.id}
                      id={`customer-row-${c.id}`}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* Nopol */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs tracking-wider text-slate-800 border border-slate-300">
                          {c.nopol}
                        </span>
                      </td>

                      {/* Nama */}
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {c.nama || <span className="text-slate-400 italic">Tanpa Nama</span>}
                      </td>

                      {/* HP */}
                      <td className="px-5 py-4 text-slate-600">
                        {c.hp ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{c.hp}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Kendaraan */}
                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          <Car className="h-3 w-3 text-slate-500" />
                          {c.kendaraan || 'Mobil'}
                        </span>
                      </td>

                      {/* Total Kunjungan */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-[#0A2A5E]">
                          {c.total_kunjungan || 0}x
                        </span>
                      </td>

                      {/* Total Omzet */}
                      <td className="px-5 py-4 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(c.total_omzet || 0)}
                      </td>

                      {/* Tier Badge */}
                      <td className="px-5 py-4 text-center">
                        {isGold ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                            <Crown className="h-3 w-3 text-amber-600" />
                            Gold
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            Reguler
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-center">
                        <Link
                          id={`btn-detail-customer-${c.id}`}
                          href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0A2A5E] shadow-2xs transition hover:bg-slate-50 hover:border-[#0A2A5E]"
                        >
                          <span>Detail & Ganti Plat</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span>Menampilkan {filteredCustomers.length} dari total {customers.length} customer</span>
          <span>Tier otomatis menjadi <strong>Gold</strong> saat total kunjungan aktif &ge; 50 kali</span>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
