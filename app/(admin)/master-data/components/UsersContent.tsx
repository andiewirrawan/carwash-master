'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Role } from '@/types/database';
import { getUsersList, addUser, updateUser, deleteUser, resetPassword } from '@/lib/db';
import { formatDate } from '@/lib/format';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  KeyRound,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export function UsersContent() {
  const { isSistemOwner, user: currentSessionUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal Add/Edit state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Form states
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [nama, setNama] = useState<string>('');
  const [role, setRole] = useState<Role>('admin');
  const [aktif, setAktif] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  // Delete modal
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);

  const loadData = async () => {
    setLoading(true);
    const data = await getUsersList();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditUser(null);
    setUsername('');
    setPassword('');
    setNama('');
    setRole('admin');
    setAktif(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditUser(u);
    setUsername(u.username);
    setPassword('');
    setNama(u.nama);
    setRole(u.role);
    setAktif(u.aktif);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!username.trim()) {
      setFormError('Username wajib diisi.');
      return;
    }
    if (!nama.trim()) {
      setFormError('Nama Pengguna wajib diisi.');
      return;
    }

    if (!editUser && !password.trim()) {
      setFormError('Password wajib diisi untuk user baru.');
      return;
    }

    setSaving(true);
    try {
      if (editUser) {
        await updateUser(
          editUser.id,
          {
            username: username.trim(),
            nama: nama.trim(),
            role,
            aktif,
            ...(password ? { password_hash: password } : {}),
          },
          currentSessionUser?.id
        );
      } else {
        await addUser(
          {
            username: username.trim(),
            password_hash: password,
            nama: nama.trim(),
            role,
            aktif,
          },
          currentSessionUser?.id
        );
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan data user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAktif = async (u: User) => {
    try {
      await updateUser(u.id, { aktif: !u.aktif }, currentSessionUser?.id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah status aktif user.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;

    try {
      await resetPassword(resetModalUser.id, newPassword, currentSessionUser?.id);
      setResetModalUser(null);
      setNewPassword('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mereset password.');
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteUser(deleteId, currentSessionUser?.id);
      setDeleteId(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus user.');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      return (
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.nama.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  if (!isSistemOwner) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Akses Khusus Sistem Owner (Wiro)</h2>
        <p className="text-slate-600 mt-2">Anda tidak memiliki izin untuk mengelola Pengguna Sistem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            Kelola User & Hak Akses
          </h2>
          <p className="text-sm text-slate-500">
            Khusus Sistem Owner. Kelola akun kasir, spv, dan owner.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
        >
          <Plus className="h-4 w-4" />
          Tambah User Baru
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari username, nama, role..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-800 focus:border-[#0A2A5E] focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-[#0A2A5E] text-xs font-semibold uppercase tracking-wider text-white">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Username</th>
                <th className="px-4 py-3.5">Nama</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5 text-center">Status</th>
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
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">Tidak ada user.</td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">#{u.id}</td>
                    <td className="px-4 py-3 font-bold text-[#0A2A5E]">{u.username}</td>
                    <td className="px-4 py-3 font-medium">{u.nama}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleAktif(u)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${u.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {u.aktif ? 'Aktif' : 'Non-Aktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setResetModalUser(u)} className="p-1 text-amber-600 hover:bg-amber-50" title="Reset Password">
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEditModal(u)} className="p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(u.id)} className="p-1 text-slate-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
          <span className="text-xs text-slate-500">Halaman {currentPage} dari {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded border disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded border disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A2A5E] px-6 py-4 text-white">
              <h3 className="text-base font-bold">{editUser ? 'Edit Data User' : 'Tambah User Baru'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Username *</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Nama Lengkap *</label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Password {editUser && '(Opsional)'}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editUser} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Role Akses</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm">
                  <option value="admin">admin</option>
                  <option value="spv">spv</option>
                  <option value="owner">owner</option>
                  <option value="sistem_owner">sistem_owner</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-semibold border rounded-lg">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-[#F97316] rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold">Reset Password</h3>
            <p className="text-xs text-slate-500">Reset password untuk: {resetModalUser.nama}</p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <input type="password" placeholder="Password baru" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setResetModalUser(null)} className="px-3 py-1.5 text-xs font-semibold border rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4 text-center">
            <h3 className="text-base font-bold">Hapus User?</h3>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-xs font-semibold border rounded-lg">Batal</button>
              <button onClick={handleDelete} className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
