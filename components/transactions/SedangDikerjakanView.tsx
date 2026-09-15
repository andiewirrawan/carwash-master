'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getTransactions,
  getStaffList,
  assignTransactionStaff,
  calculateStaffCommissionsForTransaction,
  getPriceList,
  updateTransaction,
  deleteTransaction,
} from '@/lib/db';
import { Transaction, Staff, PriceList, TransactionStaff } from '@/types/database';
import { formatNominal } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import {
  Car,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Check,
  ArrowRight,
  AlertTriangle,
  Users,
  CheckCircle2,
  Phone,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface SedangDikerjakanViewProps {
  onNavigateStep?: (step: 'pembayaran' | 'mobil-masuk', trxId?: number) => void;
  highlightTrxId?: number;
}

export function SedangDikerjakanView({ onNavigateStep, highlightTrxId }: SedangDikerjakanViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [priceList, setPriceList] = useState<PriceList[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncingTrxIds, setSyncingTrxIds] = useState<Record<number, boolean>>({});

  // Edit Modal State
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [editNopol, setEditNopol] = useState<string>('');
  const [editCustomerNama, setEditCustomerNama] = useState<string>('');
  const [editCustomerHp, setEditCustomerHp] = useState<string>('');
  const [editPriceId, setEditPriceId] = useState<number>(0);
  const [editHarga, setEditHarga] = useState<number>(0);
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deleteTargetTrx, setDeleteTargetTrx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load all in-progress transactions, staff, and price list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTrx, allStaff, allPrices] = await Promise.all([
        getTransactions({ status: 'aktif', status_pengerjaan: 'proses' }),
        getStaffList(),
        getPriceList(),
      ]);

      setTransactions(allTrx);
      setStaffList(allStaff.filter((s) => s.aktif));
      setPriceList(allPrices);
    } catch (err) {
      console.error('Gagal memuat data pengerjaan mobil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter staff by active roles
  const activeWashers = useMemo(() => {
    return staffList.filter((s) => s.role?.toLowerCase() === 'washer');
  }, [staffList]);

  const activeCheckers = useMemo(() => {
    return staffList.filter((s) => s.role?.toLowerCase() === 'checker');
  }, [staffList]);

  // 1-Click Toggle Washer Assignment
  const handleToggleWasher = async (trx: Transaction, staffId: number) => {
    const currentAssignments = trx.staff_assigned || [];
    const currentWasherIds = currentAssignments
      .filter((s) => s.peran === 'washer')
      .map((s) => s.staff_id);
    const currentCheckerIds = currentAssignments
      .filter((s) => s.peran === 'checker')
      .map((s) => s.staff_id);

    const isCurrentlySelected = currentWasherIds.includes(staffId);
    const newWasherIds = isCurrentlySelected
      ? currentWasherIds.filter((id) => id !== staffId)
      : [...currentWasherIds, staffId];

    // Optimistic UI update
    const staffObj = staffList.find((s) => s.id === staffId);
    const updatedStaffAssigned: TransactionStaff[] = [
      ...currentAssignments.filter((s) => s.peran !== 'washer'),
      ...newWasherIds.map((id) => {
        const existing = currentAssignments.find((s) => s.staff_id === id && s.peran === 'washer');
        const st = staffList.find((s) => s.id === id);
        return {
          transaction_id: trx.id,
          staff_id: id,
          peran: 'washer',
          komisi: existing ? existing.komisi : 0,
          staff_nama: existing?.staff_nama || st?.nama || `Washer #${id}`,
          role: 'washer',
        };
      }),
    ];

    setTransactions((prev) =>
      prev.map((t) => (t.id === trx.id ? { ...t, staff_assigned: updatedStaffAssigned } : t))
    );

    // Background sync to database
    setSyncingTrxIds((prev) => ({ ...prev, [trx.id]: true }));
    try {
      const priceId = trx.price_list_id || 0;
      const calculatedCommissions = await calculateStaffCommissionsForTransaction(
        priceId,
        trx.tanggal,
        newWasherIds,
        currentCheckerIds
      );

      await assignTransactionStaff(
        trx.id,
        calculatedCommissions.map((c) => ({
          staff_id: c.staff_id,
          peran: c.peran,
          komisi: c.komisi,
        }))
      );
    } catch (err) {
      console.error('Gagal memperbarui penugasan washer:', err);
      // Revert from server on error
      loadData();
    } finally {
      setSyncingTrxIds((prev) => ({ ...prev, [trx.id]: false }));
    }
  };

  // 1-Click Toggle Checker Assignment
  const handleToggleChecker = async (trx: Transaction, staffId: number) => {
    const currentAssignments = trx.staff_assigned || [];
    const currentWasherIds = currentAssignments
      .filter((s) => s.peran === 'washer')
      .map((s) => s.staff_id);
    const currentCheckerIds = currentAssignments
      .filter((s) => s.peran === 'checker')
      .map((s) => s.staff_id);

    const isCurrentlySelected = currentCheckerIds.includes(staffId);
    const newCheckerIds = isCurrentlySelected
      ? currentCheckerIds.filter((id) => id !== staffId)
      : [...currentCheckerIds, staffId];

    // Optimistic UI update
    const staffObj = staffList.find((s) => s.id === staffId);
    const updatedStaffAssigned: TransactionStaff[] = [
      ...currentAssignments.filter((s) => s.peran !== 'checker'),
      ...newCheckerIds.map((id) => {
        const existing = currentAssignments.find((s) => s.staff_id === id && s.peran === 'checker');
        const st = staffList.find((s) => s.id === id);
        return {
          transaction_id: trx.id,
          staff_id: id,
          peran: 'checker',
          komisi: existing ? existing.komisi : 0,
          staff_nama: existing?.staff_nama || st?.nama || `Checker #${id}`,
          role: 'checker',
        };
      }),
    ];

    setTransactions((prev) =>
      prev.map((t) => (t.id === trx.id ? { ...t, staff_assigned: updatedStaffAssigned } : t))
    );

    // Background sync to database
    setSyncingTrxIds((prev) => ({ ...prev, [trx.id]: true }));
    try {
      const priceId = trx.price_list_id || 0;
      const calculatedCommissions = await calculateStaffCommissionsForTransaction(
        priceId,
        trx.tanggal,
        currentWasherIds,
        newCheckerIds
      );

      await assignTransactionStaff(
        trx.id,
        calculatedCommissions.map((c) => ({
          staff_id: c.staff_id,
          peran: c.peran,
          komisi: c.komisi,
        }))
      );
    } catch (err) {
      console.error('Gagal memperbarui penugasan checker:', err);
      // Revert from server on error
      loadData();
    } finally {
      setSyncingTrxIds((prev) => ({ ...prev, [trx.id]: false }));
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setEditNopol(trx.no_polisi || '');
    setEditCustomerNama(trx.customer_nama || '');
    setEditCustomerHp(trx.customer_hp || '');
    setEditPriceId(trx.price_list_id || 0);
    setEditHarga(Number(trx.harga || 0));
    setEditKeterangan(trx.keterangan || '');
  };

  const handlePriceSelectChange = (newPriceId: number) => {
    setEditPriceId(newPriceId);
    const selected = priceList.find((p) => p.id === newPriceId);
    if (selected) {
      setEditHarga(Number(selected.harga));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTrx) return;

    if (!editNopol.trim()) {
      alert('Nomor polisi (plat) wajib diisi!');
      return;
    }

    setIsSavingEdit(true);
    try {
      const selectedPrice = priceList.find((p) => p.id === editPriceId);

      await updateTransaction(editingTrx.id, {
        no_polisi: editNopol.trim().toUpperCase(),
        customer_nama: editCustomerNama.trim() || 'Pelanggan Umum',
        customer_hp: editCustomerHp.trim() || undefined,
        price_list_id: editPriceId || editingTrx.price_list_id,
        kendaraan: selectedPrice?.kendaraan || editingTrx.kendaraan,
        paket_nama: selectedPrice?.paket || editingTrx.paket_nama,
        tipe: selectedPrice?.tipe || editingTrx.tipe,
        fasilitas: selectedPrice?.fasilitas || editingTrx.fasilitas,
        harga: editHarga,
        keterangan: editKeterangan.trim() || null,
      });

      await loadData();
      setEditingTrx(null);
    } catch (err: any) {
      console.error('Gagal mengedit transaksi:', err);
      alert(`Gagal menyimpan perubahan: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Transaction Handler
  const handleConfirmDelete = async () => {
    if (!deleteTargetTrx) return;

    setIsDeleting(true);
    try {
      await deleteTransaction(deleteTargetTrx.id);
      await loadData();
      setDeleteTargetTrx(null);
    } catch (err: any) {
      console.error('Gagal menghapus transaksi:', err);
      alert(`Gagal menghapus transaksi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Search filter (Nopol & Nama Pelanggan)
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((t) => {
      const matchNopol = t.no_polisi?.toLowerCase().includes(q);
      const matchCust = t.customer_nama?.toLowerCase().includes(q);
      const matchNoTrx = t.no_transaksi?.toLowerCase().includes(q);
      const matchPaket = t.paket_nama?.toLowerCase().includes(q);
      return matchNopol || matchCust || matchNoTrx || matchPaket;
    });
  }, [transactions, searchQuery]);

  return (
    <div className="space-y-4">
      {/* 8. HEADER & WORKFLOW BRANDING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-black shadow-xs">
              2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="heading-sedang-dikerjakan" className="text-xl font-bold tracking-tight text-slate-900">
                  Kendaraan Sedang Dikerjakan
                </h1>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                  {transactions.length} Kendaraan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik nama washer atau checker untuk menugaskan atau membatalkan penugasan.
              </p>
            </div>
          </div>
        </div>

        {/* 9. SEARCH BAR */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-sedang-dikerjakan"
              type="text"
              placeholder="Cari Nopol / Nama Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="btn-refresh-sedang-dikerjakan"
            type="button"
            onClick={loadData}
            title="Muat Ulang Data"
            className="p-2 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1 & 2. TABEL SEMUA KENDARAAN (VERTICAL CONTINUOUS TABLE, NO PAGINATION, NO CARDS LIMIT) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-3.5 text-center w-12">No</th>
                <th className="py-3 px-3.5 w-36">Nopol</th>
                <th className="py-3 px-3.5 w-44">Pelanggan</th>
                <th className="py-3 px-3.5 w-48">Layanan</th>
                <th className="py-3 px-3.5 w-28 text-right">Harga</th>
                <th className="py-3 px-4 min-w-[280px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Washer (Petugas Cuci)</span>
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[180px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Checker (Pemeriksa)</span>
                  </div>
                </th>
                <th className="py-3 px-3.5 w-32">Kasir</th>
                <th className="py-3 px-3.5 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {/* Empty state */}
              {!loading && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <Car className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {searchQuery ? 'Tidak Ada Kendaraan Sesuai Pencarian' : 'Tidak Ada Kendaraan Sedang Dikerjakan'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {searchQuery
                          ? `Tidak ditemukan plat atau pelanggan dengan kata kunci "${searchQuery}".`
                          : 'Semua mobil telah selesai dikerjakan atau belum ada mobil yang masuk.'}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => onNavigateStep?.('mobil-masuk')}
                          className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Car className="w-4 h-4" />
                          <span>Input Mobil Masuk</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Transaction Rows */}
              {filteredTransactions.map((trx, index) => {
                const assignedStaff = trx.staff_assigned || [];
                const assignedWasherIds = assignedStaff
                  .filter((s) => s.peran === 'washer')
                  .map((s) => s.staff_id);
                const assignedCheckerIds = assignedStaff
                  .filter((s) => s.peran === 'checker')
                  .map((s) => s.staff_id);

                const isHighlighted = highlightTrxId === trx.id;
                const isSyncing = syncingTrxIds[trx.id];
                const cashierName = trx.kasir_nama || user?.nama || 'Kasir';

                return (
                  <tr
                    key={trx.id}
                    id={`row-trx-${trx.id}`}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isHighlighted ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-400' : ''
                    }`}
                  >
                    {/* 1. NO */}
                    <td className="py-3 px-3.5 text-center font-bold text-slate-400 text-xs">
                      {index + 1}
                    </td>

                    {/* 2. NOPOL */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md tracking-wider">
                          {trx.no_polisi}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{trx.waktu ? trx.waktu.substring(0, 5) : '-'}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-[10px] text-slate-400">{trx.no_transaksi}</span>
                      </div>
                    </td>

                    {/* 3. PELANGGAN */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 truncate max-w-[160px]">
                        {trx.customer_nama}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            trx.customer_tier === 'gold'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {trx.customer_tier === 'gold' ? '★ GOLD' : 'Reguler'}
                        </span>
                        {trx.customer_hp && (
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {trx.customer_hp}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. LAYANAN */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{trx.paket_nama}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="font-medium text-slate-600">{trx.kendaraan}</span>
                        {trx.tipe && <span>&bull; {trx.tipe}</span>}
                      </div>
                      {trx.keterangan && (
                        <div className="mt-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 line-clamp-1">
                          {trx.keterangan}
                        </div>
                      )}
                    </td>

                    {/* 5. HARGA */}
                    <td className="py-3 px-3.5 text-right">
                      <span className="font-mono font-black text-xs text-blue-700">
                        Rp {formatNominal(trx.harga)}
                      </span>
                    </td>

                    {/* 3. WASHER BUTTONS/CHIPS */}
                    <td className="py-3 px-4">
                      {activeWashers.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Tidak ada washer aktif</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {activeWashers.map((washer) => {
                            const isSelected = assignedWasherIds.includes(washer.id);
                            return (
                              <button
                                key={washer.id}
                                id={`btn-washer-${trx.id}-${washer.id}`}
                                type="button"
                                onClick={() => handleToggleWasher(trx, washer.id)}
                                title={
                                  isSelected
                                    ? `Washer ${washer.nama} ditugaskan. Klik untuk batalkan.`
                                    : `Klik untuk menugaskan ${washer.nama}`
                                }
                                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all select-none flex items-center gap-1 active:scale-95 cursor-pointer border ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-400 hover:bg-emerald-700'
                                    : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-200/80 hover:border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                <span>{washer.nama}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {assignedWasherIds.length === 0 && (
                        <div className="mt-1 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Pilih washer yang bertugas</span>
                        </div>
                      )}
                    </td>

                    {/* 4. CHECKER BUTTONS/CHIPS */}
                    <td className="py-3 px-4">
                      {activeCheckers.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Tidak ada checker aktif</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {activeCheckers.map((checker) => {
                            const isSelected = assignedCheckerIds.includes(checker.id);
                            return (
                              <button
                                key={checker.id}
                                id={`btn-checker-${trx.id}-${checker.id}`}
                                type="button"
                                onClick={() => handleToggleChecker(trx, checker.id)}
                                title={
                                  isSelected
                                    ? `Checker ${checker.nama} ditugaskan. Klik untuk batalkan.`
                                    : `Klik untuk menugaskan ${checker.nama}`
                                }
                                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all select-none flex items-center gap-1 active:scale-95 cursor-pointer border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400 hover:bg-blue-700'
                                    : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-200/80 hover:border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                <span>{checker.nama}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* 5. KASIR */}
                    <td className="py-3 px-3.5 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span className="truncate max-w-[110px]" title={cashierName}>
                          {cashierName}
                        </span>
                      </div>
                    </td>

                    {/* 6. AKSI: [✏ Edit] [🗑 Hapus] + [💳 Bayar] */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          id={`btn-edit-trx-${trx.id}`}
                          type="button"
                          onClick={() => handleOpenEdit(trx)}
                          title="Edit Data Transaksi"
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-[11px] inline-flex items-center gap-1 transition shadow-2xs"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {/* Hapus Button */}
                        <button
                          id={`btn-delete-trx-${trx.id}`}
                          type="button"
                          onClick={() => setDeleteTargetTrx(trx)}
                          title="Hapus Transaksi"
                          className="px-2 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold text-[11px] inline-flex items-center gap-1 transition shadow-2xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>

                        {/* Direct Pay Button */}
                        <button
                          id={`btn-bayar-trx-${trx.id}`}
                          type="button"
                          onClick={() => onNavigateStep?.('pembayaran', trx.id)}
                          title="Proses Pembayaran"
                          className="p-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & summary */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Menampilkan <strong className="text-slate-800">{filteredTransactions.length}</strong> mobil dalam antrean pengerjaan.
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span>
              <span>Washer Terpilih</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
              <span>Checker Terpilih</span>
            </span>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT DATA TRANSAKSI */}
      {editingTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Edit Data Transaksi: {editingTrx.no_transaksi}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Plat Nomor */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Polisi (Plat Mobil)</label>
                <input
                  type="text"
                  value={editNopol}
                  onChange={(e) => setEditNopol(e.target.value.toUpperCase())}
                  placeholder="Contoh: B 1234 ABC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm uppercase focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              {/* Nama Pelanggan & HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    value={editCustomerNama}
                    onChange={(e) => setEditCustomerNama(e.target.value)}
                    placeholder="Nama Pelanggan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No HP / WhatsApp</label>
                  <input
                    type="text"
                    value={editCustomerHp}
                    onChange={(e) => setEditCustomerHp(e.target.value)}
                    placeholder="0812xxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Pilihan Paket Layanan & Harga */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Paket Layanan / Price List</label>
                <select
                  value={editPriceId}
                  onChange={(e) => handlePriceSelectChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value={0}>-- Pilih Paket Layanan --</option>
                  {priceList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kendaraan} &bull; {p.paket} ({p.tipe}) - Rp {formatNominal(p.harga)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Harga Nominal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Transaksi (Rp)</label>
                <input
                  type="number"
                  value={editHarga}
                  onChange={(e) => setEditHarga(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm text-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Khusus (Opsional)</label>
                <textarea
                  rows={2}
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  placeholder="Catatan pengerjaan atau permintaan khusus pelanggan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTrx(null)}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-xs text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white inline-flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS TRANSAKSI */}
      {deleteTargetTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Hapus Antrean Mobil?</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus antrean pengerjaan untuk mobil dengan plat{' '}
                <strong className="font-mono text-slate-900 font-bold">{deleteTargetTrx.no_polisi}</strong> (
                {deleteTargetTrx.customer_nama})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetTrx(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-xs text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white inline-flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Mobil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
