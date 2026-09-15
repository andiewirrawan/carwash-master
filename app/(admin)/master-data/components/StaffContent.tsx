'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Staff, StaffKomisiMultiplier } from '@/types/database';
import {
  getStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  getStaffMultipliers,
  addStaffMultiplier,
} from '@/lib/db';
import { formatDate } from '@/lib/format';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Percent,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
  History,
} from 'lucide-react';

export function StaffContent() {
  const { hasAccess, user } = useAuth();
  const canAccess = hasAccess('spv');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliers, setMultipliers] = useState<StaffKomisiMultiplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states
  const [nama, setNama] = useState<string>('');
  const [role, setRole] = useState<string>('washer');
  const [aktif, setAktif] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Multiplier History Modal states
  const [historyModalStaff, setHistoryModalStaff] = useState<Staff | null>(null);
  const [newMultiplierVal, setNewMultiplierVal] = useState<string>('10');
  const [newBerlakuMulai, setNewBerlakuMulai] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [savingMultiplier, setSavingMultiplier] = useState<boolean>(false);
  const [multiplierError, setMultiplierError] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  const loadData = async () => {
    setLoading(true);
    const [staffData, multData] = await Promise.all([
      getStaffList(),
      getStaffMultipliers(),
    ]);
    setStaffList(staffData);
    setMultipliers(multData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const latestMultipliersMap = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const map: Record<number, { multiplier: number; berlaku_mulai: string }> = {};

    staffList.forEach((s) => {
      const staffMults = multipliers.filter((m) => m.staff_id === s.id);
      const valid = staffMults.filter((m) => m.berlaku_mulai <= today);
      if (valid.length > 0) {
        valid.sort((a, b) => b.berlaku_mulai.localeCompare(a.berlaku_mulai));
        map[s.id] = {
          multiplier: valid[0].multiplier,
          berlaku_mulai: valid[0].berlaku_mulai,
        };
      } else if (staffMults.length > 0) {
        staffMults.sort((a, b) => a.berlaku_mulai.localeCompare(b.berlaku_mulai));
        map[s.id] = {
          multiplier: staffMults[0].multiplier,
          berlaku_mulai: staffMults[0].berlaku_mulai,
        };
      } else {
        map[s.id] = { multiplier: 0, berlaku_mulai: '-' };
      }
    });

    return map;
  }, [staffList, multipliers]);

  const openAddModal = () => {
    setEditItem(null);
    setNama('');
    setRole('washer');
    setAktif(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: Staff) => {
    setEditItem(item);
    setNama(item.nama);
    setRole(item.role);
    setAktif(item.aktif);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nama.trim()) {
      setFormError('Nama staff wajib diisi.');
      return;
    }
    if (!role.trim()) {
      setFormError('Role staff wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await updateStaff(editItem.id, {
          nama: nama.trim(),
          role: role.trim().toLowerCase(),
          aktif,
        });
      } else {
        await addStaff({
          nama: nama.trim(),
          role: role.trim().toLowerCase(),
          aktif,
        });
      }
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data staff.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteStaff(deleteId);
      await loadData();
      setDeleteId(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewMultiplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyModalStaff) return;
    setMultiplierError('');

    const multNum = parseFloat(newMultiplierVal);
    if (isNaN(multNum)) {
      setMultiplierError('Nilai multiplier harus berupa angka.');
      return;
    }
    if (!newBerlakuMulai) {
      setMultiplierError('Tanggal berlaku mulai wajib ditentukan.');
      return;
    }

    setSavingMultiplier(true);
    try {
      await addStaffMultiplier({
        staff_id: historyModalStaff.id,
        multiplier: multNum,
        berlaku_mulai: newBerlakuMulai,
        dientry_oleh: user?.id || null,
        dientry_oleh_nama: user?.nama || 'SPV/Owner',
        created_at: new Date().toISOString(),
      });
      const multData = await getStaffMultipliers();
      setMultipliers(multData);
      setNewMultiplierVal('10');
    } catch (err: any) {
      setMultiplierError(err.message || 'Gagal menambahkan riwayat multiplier.');
    } finally {
      setSavingMultiplier(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase());

      const matchRole =
        filterRole === 'ALL' || s.role.toLowerCase() === filterRole.toLowerCase();

      return matchSearch && matchRole;
    });
  }, [staffList, search, filterRole]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  const staffHistoryList = useMemo(() => {
    if (!historyModalStaff) return [];
    return multipliers
      .filter((m) => m.staff_id === historyModalStaff.id)
      .sort((a, b) => b.berlaku_mulai.localeCompare(a.berlaku_mulai));
  }, [multipliers, historyModalStaff]);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-slate-600 mt-2">Anda tidak memiliki izin untuk mengelola Data Staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Data Staff & Karyawan
          </h2>
          <p className="text-sm text-slate-500">
            Kelola daftar personil operasional car wash dan penyesuaian multiplier komisi.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
        >
          <Plus className="h-4 w-4" />
          Tambah Staff Baru
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama staff atau role..."
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
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          >
            <option value="ALL">Semua Role</option>
            <option value="washer">Washer</option>
            <option value="checker">Checker</option>
            <option value="leader">Leader</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Nama Staff</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Multiplier Aktif</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada data staff.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const multInfo = latestMultipliersMap[item.id] || { multiplier: 0, berlaku_mulai: '-' };
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">#{item.id}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{item.nama}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#0A2A5E]">
                          {item.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {item.aktif ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${multInfo.multiplier > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {multInfo.multiplier > 0 ? `+${multInfo.multiplier}%` : '0%'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setHistoryModalStaff(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600"
                            title="Riwayat Multiplier"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-[#0A2A5E]"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
              <h3 className="text-base font-bold">{editItem ? 'Edit Data Staff' : 'Tambah Staff Baru'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="p-6 space-y-4">
              {formError && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Nama Staff *</label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Role *</label>
                <input type="text" value={role} onChange={(e) => setRole(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="chk-aktif" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="chk-aktif" className="text-sm font-medium">Staff Aktif</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-semibold border rounded-lg">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-[#F97316] rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
              <h3 className="text-base font-bold">Riwayat Multiplier: {historyModalStaff.nama}</h3>
              <button onClick={() => setHistoryModalStaff(null)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form onSubmit={handleAddNewMultiplier} className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase text-[#0A2A5E]">Tambah Multiplier Baru</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.1" value={newMultiplierVal} onChange={(e) => setNewMultiplierVal(e.target.value)} className="w-full rounded border px-3 py-1.5 text-xs" placeholder="%" />
                  <input type="date" value={newBerlakuMulai} onChange={(e) => setNewBerlakuMulai(e.target.value)} className="w-full rounded border px-3 py-1.5 text-xs" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={savingMultiplier} className="px-4 py-2 text-xs font-semibold text-white bg-[#0A2A5E] rounded-lg">Simpan</button>
                </div>
              </form>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700">Riwayat Perubahan</h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr><th className="px-3 py-2">Multiplier</th><th className="px-3 py-2">Berlaku</th><th className="px-3 py-2">Oleh</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {staffHistoryList.map((m) => (
                        <tr key={m.id}><td className="px-3 py-2 font-bold">+{m.multiplier}%</td><td className="px-3 py-2">{formatDate(m.berlaku_mulai)}</td><td className="px-3 py-2">{m.dientry_oleh_nama}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setHistoryModalStaff(null)} className="px-4 py-2 text-xs font-semibold border rounded-lg">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4 text-center">
            <h3 className="text-base font-bold">Konfirmasi Hapus</h3>
            <p className="text-xs text-slate-600">Hapus data staff ini?</p>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-xs font-semibold border rounded-lg">Batal</button>
              <button onClick={handleDeleteStaff} disabled={saving} className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg text-white">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
