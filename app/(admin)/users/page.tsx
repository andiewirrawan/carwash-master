'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
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

export default function UsersManagementPage() {
  const { isSistemOwner } = useAuth();

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
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

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
        await updateUser(editUser.id, {
          username: username.trim(),
          nama: nama.trim(),
          role,
          aktif,
          ...(password ? { password_hash: password } : {}),
        });
      } else {
        await addUser({
          username: username.trim(),
          password_hash: password,
          nama: nama.trim(),
          role,
          aktif,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError('Gagal menyimpan data user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAktif = async (u: User) => {
    await updateUser(u.id, { aktif: !u.aktif });
    await loadData();
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;

    await resetPassword(resetModalUser.id, newPassword);
    setResetModalUser(null);
    setNewPassword('');
    await loadData();
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await deleteUser(deleteId);
    setDeleteId(null);
    await loadData();
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
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 mb-4 shadow-sm">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0A2A5E]">Akses Khusus Sistem Owner (Wiro)</h2>
          <p className="mt-2 text-xs text-slate-500 max-w-md">
            Halaman Kelola User terbatas khusus untuk role <strong className="text-purple-700">sistem_owner</strong>. Anda saat ini belum memiliki wewenang untuk menambah, mereset password, atau mengedit pengguna.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-purple-700" />
              Kelola User (Khusus Sistem Owner — Wiro)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Tambah user, ubah role (admin, spv, owner, sistem_owner), atur status aktif, dan reset password.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] focus:outline-none transition-all"
          >
            <Plus className="h-4 w-4" />
            Tambah User Baru
          </button>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari username, nama, role..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">ID</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Nama Lengkap</th>
                  <th className="px-4 py-3.5">Role Akses</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5">Dibuat Pada (dd/mm/yyyy)</th>
                  <th className="px-4 py-3.5 text-center w-36">Aksi & Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                        <span>Memuat data user...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data pengguna.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-400">#{u.id}</td>
                      <td className="px-4 py-3 font-bold text-[#0A2A5E]">{u.username}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{u.nama}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            u.role === 'sistem_owner'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'owner'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'spv'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAktif(u)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                            u.aktif
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Ubah Status Keaktifan"
                        >
                          {u.aktif ? (
                            <>
                              <UserCheck className="h-3 w-3 text-emerald-600" /> Aktif
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 text-slate-500" /> Non-Aktif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setResetModalUser(u);
                              setNewPassword('');
                            }}
                            className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 border border-amber-200"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                            <span>Reset</span>
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            className="rounded p-1 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="rounded p-1 text-slate-600 hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
                          >
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

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Halaman <span className="font-bold text-slate-900">{currentPage}</span> dari{' '}
                <span className="font-bold text-slate-900">{totalPages}</span> (Total{' '}
                {filteredUsers.length} data)
              </span>

              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-500">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="w-12 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-center font-bold text-slate-800 focus:border-[#F97316] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-[#0A2A5E] px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-900"
                >
                  Go
                </button>
              </form>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Add / Edit User */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E]">
                  {editUser ? 'Edit Data User' : 'Tambah User Baru'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: wiro / kasir2"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Wiro (Sistem Owner) / Siti"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password {editUser && '(Kosongkan jika tidak diubah)'}
                  </label>
                  <input
                    type="password"
                    required={!editUser}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Hierarki Akses</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:border-[#F97316] focus:outline-none"
                  >
                    <option value="admin">admin (Kasir - Input Transaksi & Master Data)</option>
                    <option value="spv">spv (SPV Keuangan - Approve & Laporan)</option>
                    <option value="owner">owner (Owner - Insentif, Void, Laporan Lengkap)</option>
                    <option value="sistem_owner">sistem_owner (Wiro - Full Access & Kelola User)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="userAktifCheck"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                  />
                  <label htmlFor="userAktifCheck" className="font-semibold text-slate-700">
                    Status User Aktif Bisa Login
                  </label>
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
                        <span>Simpan User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Reset Password */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Password User</h3>
                  <p className="text-xs text-slate-500">Target: {resetModalUser.nama} ({resetModalUser.username})</p>
                </div>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus akun user ini?
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
