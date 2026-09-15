'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Staff, StaffKomisiMultiplier } from '@/types/database';
import {
  getStaffList,
  getStaffMultipliers,
  addStaffMultiplier,
} from '@/lib/db';
import { formatDate, toInputDate } from '@/lib/format';
import {
  Percent,
  Plus,
  Search,
  Check,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react';

export function StaffMultipliersContent() {
  const { user, hasAccess } = useAuth();
  const canAccess = hasAccess('spv');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliers, setMultipliers] = useState<StaffKomisiMultiplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number>(1);
  const [multiplierVal, setMultiplierVal] = useState<string>('10');
  const [berlakuMulai, setBerlakuMulai] = useState<string>(toInputDate('2026-12-01'));
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);

  const loadData = async () => {
    setLoading(true);
    const [staffData, multData] = await Promise.all([
      getStaffList(),
      getStaffMultipliers(),
    ]);
    setStaffList(staffData);
    setMultipliers(multData);
    if (staffData.length > 0) {
      setSelectedStaffId(staffData[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMultiplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const multNum = parseFloat(multiplierVal);
    if (isNaN(multNum) || multNum < 0) {
      setFormError('Multiplier persen harus berupa angka 0 atau lebih.');
      return;
    }

    if (!berlakuMulai) {
      setFormError('Tanggal berlaku mulai wajib dipilih.');
      return;
    }

    setSaving(true);
    try {
      await addStaffMultiplier({
        staff_id: selectedStaffId,
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

  const staffMap = useMemo(() => {
    const map: Record<number, Staff> = {};
    staffList.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [staffList]);

  const filteredMultipliers = useMemo(() => {
    return multipliers.filter((m) => {
      const staffObj = staffMap[m.staff_id];
      const staffName = staffObj ? staffObj.nama.toLowerCase() : '';
      const matchSearch = staffName.includes(search.toLowerCase());
      const matchStaff =
        selectedStaffFilter === 'ALL' || String(m.staff_id) === selectedStaffFilter;

      return matchSearch && matchStaff;
    });
  }, [multipliers, staffMap, search, selectedStaffFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMultipliers.length / pageSize));
  const paginatedMultipliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMultipliers.slice(start, start + pageSize);
  }, [filteredMultipliers, currentPage, pageSize]);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-slate-600 mt-2">Anda tidak memiliki izin untuk mengelola Riwayat Multiplier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-600" />
            Riwayat Multiplier Komisi
          </h2>
          <p className="text-sm text-slate-500">
            Daftar historis penyesuaian bonus/insentif staff per tanggal efektif.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
        >
          <Plus className="h-4 w-4" />
          Tambah Riwayat Baru
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedStaffFilter}
            onChange={(e) => {
              setSelectedStaffFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          >
            <option value="ALL">Semua Staff</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
              <tr>
                <th className="px-4 py-3.5">Nama Staff</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Multiplier</th>
                <th className="px-4 py-3.5">Berlaku Mulai</th>
                <th className="px-4 py-3.5">Dientry Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : paginatedMultipliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">Tidak ada riwayat multiplier.</td>
                </tr>
              ) : (
                paginatedMultipliers.map((m) => {
                  const staffObj = staffMap[m.staff_id];
                  return (
                    <tr key={m.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{staffObj?.nama || 'Unknown'}</td>
                      <td className="px-4 py-3 uppercase text-xs">{staffObj?.role || '-'}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600">+{m.multiplier}%</td>
                      <td className="px-4 py-3">{formatDate(m.berlaku_mulai)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{m.dientry_oleh_nama || 'System'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
          <span className="text-xs text-slate-500">Halaman {currentPage} dari {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
              <h3 className="text-base font-bold">Tambah Riwayat Multiplier</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMultiplier} className="p-6 space-y-4">
              {formError && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Staff *</label>
                <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Multiplier (%) *</label>
                <input type="number" step="0.1" value={multiplierVal} onChange={(e) => setMultiplierVal(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Berlaku Mulai *</label>
                <input type="date" value={berlakuMulai} onChange={(e) => setBerlakuMulai(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-semibold border rounded-lg">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-[#F97316] rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
