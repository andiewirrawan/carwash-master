'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getTransactions,
  getStaffList,
  assignTransactionStaff,
  calculateStaffCommissionsForTransaction,
  getStaffMultipliers,
} from '@/lib/db';
import { Transaction, Staff, StaffMultiplier } from '@/types/database';
import { formatNominal } from '@/lib/format';
import {
  Clock,
  Car,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  DollarSign,
  Percent,
  X,
  RefreshCw,
  Phone,
} from 'lucide-react';

interface SedangDikerjakanViewProps {
  onNavigateStep?: (step: 'pembayaran' | 'mobil-masuk', trxId?: number) => void;
  highlightTrxId?: number;
}

export function SedangDikerjakanView({ onNavigateStep, highlightTrxId }: SedangDikerjakanViewProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliers, setMultipliers] = useState<StaffMultiplier[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assignment Modal
  const [activeModalTrx, setActiveModalTrx] = useState<Transaction | null>(null);
  const [selectedWashers, setSelectedWashers] = useState<number[]>([]);
  const [selectedCheckers, setSelectedCheckers] = useState<number[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState<boolean>(false);
  const [calcPreview, setCalcPreview] = useState<
    Array<{ staff_id: number; peran: string; komisi: number; multiplier?: number }>
  >([]);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Load in-progress transactions and staff
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTrx, allStaff, allMults] = await Promise.all([
        getTransactions({ status: 'aktif', status_pengerjaan: 'proses' }),
        getStaffList(),
        getStaffMultipliers(),
      ]);

      setTransactions(allTrx);
      setStaffList(allStaff.filter((s) => s.aktif));
      setMultipliers(allMults);
    } catch (err) {
      console.error('Failed loading sedang dikerjakan data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal & prepopulate currently assigned staff
  const openAssignmentModal = useCallback((trx: Transaction) => {
    setActiveModalTrx(trx);

    const currentWashers = (trx.staff_assigned || [])
      .filter((s) => s.peran === 'washer')
      .map((s) => s.staff_id);

    const currentCheckers = (trx.staff_assigned || [])
      .filter((s) => s.peran === 'checker')
      .map((s) => s.staff_id);

    setSelectedWashers(currentWashers);
    setSelectedCheckers(currentCheckers);
  }, []);

  const closeModal = () => {
    setActiveModalTrx(null);
    setSelectedWashers([]);
    setSelectedCheckers([]);
    setCalcPreview([]);
  };

  // If highlightTrxId passed, automatically open assignment modal for it
  useEffect(() => {
    if (highlightTrxId && transactions.length > 0 && !activeModalTrx) {
      const target = transactions.find((t) => t.id === highlightTrxId);
      if (target) {
        openAssignmentModal(target);
      }
    }
  }, [highlightTrxId, transactions, activeModalTrx, openAssignmentModal]);

  // Filter staff by role
  const washerStaff = useMemo(() => staffList.filter((s) => s.role === 'washer'), [staffList]);
  const checkerStaff = useMemo(() => staffList.filter((s) => s.role === 'checker'), [staffList]);

  // Recalculate commissions when washer/checker selection changes
  useEffect(() => {
    async function updateCalculations() {
      if (!activeModalTrx || !activeModalTrx.price_list_id) {
        setCalcPreview([]);
        return;
      }

      setCalcLoading(true);
      try {
        const preview = await calculateStaffCommissionsForTransaction(
          activeModalTrx.price_list_id,
          activeModalTrx.tanggal,
          selectedWashers,
          selectedCheckers
        );
        setCalcPreview(preview);
      } catch (err) {
        console.error('Commission preview error:', err);
      } finally {
        setCalcLoading(false);
      }
    }

    if (activeModalTrx) {
      updateCalculations();
    }
  }, [activeModalTrx, selectedWashers, selectedCheckers]);

  // Toggle Washer selection
  const toggleWasher = (staffId: number) => {
    setSelectedWashers((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  // Toggle Checker selection
  const toggleChecker = (staffId: number) => {
    setSelectedCheckers((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  // Save staff assignment
  const handleSaveAssignment = async () => {
    if (!activeModalTrx) return;

    if (selectedWashers.length === 0) {
      const confirmNoWasher = window.confirm(
        'Belum ada washer yang dipilih. Apakah Anda yakin ingin menyimpan tanpa washer?'
      );
      if (!confirmNoWasher) return;
    }

    setIsSavingAssignment(true);
    try {
      const finalAssignments = await calculateStaffCommissionsForTransaction(
        activeModalTrx.price_list_id!,
        activeModalTrx.tanggal,
        selectedWashers,
        selectedCheckers
      );

      await assignTransactionStaff(
        activeModalTrx.id,
        finalAssignments.map((a) => ({
          staff_id: a.staff_id,
          peran: a.peran,
          komisi: a.komisi,
        }))
      );

      await loadData();
      closeModal();
    } catch (err: any) {
      console.error('Failed saving staff assignment:', err);
      alert(`Gagal menyimpan penugasan: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Search filter
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter(
      (t) =>
        t.no_polisi?.toLowerCase().includes(q) ||
        t.customer_nama?.toLowerCase().includes(q) ||
        t.no_transaksi?.toLowerCase().includes(q) ||
        t.paket_nama?.toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-black">
              2
            </div>
            <h2 className="text-lg font-bold text-slate-900">Kendaraan Sedang Dikerjakan</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              {transactions.length} Mobil Aktif
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 ml-9">
            Tugaskan petugas cuci (washer) & pemeriksa (checker). Dapat diganti sewaktu-waktu selama proses cuci berlangsung.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-sedang-dikerjakan"
              type="text"
              placeholder="Cari Plat / Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <button
            id="btn-refresh-sedang-dikerjakan"
            type="button"
            onClick={loadData}
            title="Muat Ulang"
            className="p-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!loading && filteredTransactions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tidak Ada Mobil Sedang Dikerjakan</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
            Saat ini tidak ada mobil yang berada dalam antrean pengerjaan. Input mobil baru yang datang di menu &quot;Mobil Masuk&quot;.
          </p>
          <button
            id="btn-goto-mobil-masuk-empty"
            type="button"
            onClick={() => onNavigateStep?.('mobil-masuk')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition"
          >
            <Car className="w-4 h-4" />
            <span>Input Mobil Masuk</span>
          </button>
        </div>
      )}

      {/* Grid of In-Progress Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTransactions.map((trx) => {
          const washers = (trx.staff_assigned || []).filter((s) => s.peran === 'washer');
          const checkers = (trx.staff_assigned || []).filter((s) => s.peran === 'checker');
          const hasWashers = washers.length > 0;

          return (
            <div
              key={trx.id}
              id={`card-dikerjakan-${trx.id}`}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                highlightTrxId === trx.id
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 tracking-wider">
                      {trx.no_transaksi}
                    </span>
                    <h3 className="text-xl font-mono font-black text-slate-900 tracking-wide mt-0.5">
                      {trx.no_polisi}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" />
                      <span>{trx.waktu || 'Baru masuk'}</span>
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="py-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pelanggan:</span>
                    <span className="font-bold text-slate-800">
                      {trx.customer_nama} ({trx.customer_tier || 'Reguler'})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">Layanan:</span>
                    <span className="font-bold text-slate-800 text-right">
                      {trx.paket_nama} &bull; {trx.tipe}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">Harga:</span>
                    <span className="font-black text-blue-700">
                      Rp {formatNominal(trx.harga)}
                    </span>
                  </div>

                  {trx.keterangan && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                      <strong>Catatan:</strong> {trx.keterangan}
                    </div>
                  )}
                </div>

                {/* Assigned Staff Badges */}
                <div className="pt-2 pb-1 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Petugas Cuci (Washer)
                  </p>

                  {hasWashers ? (
                    <div className="flex flex-wrap gap-1.5">
                      {washers.map((w, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          <span>🚿 {w.staff_nama}</span>
                          <span className="text-[10px] font-semibold text-emerald-600">
                            (Rp {formatNominal(w.komisi)})
                          </span>
                        </span>
                      ))}

                      {checkers.map((c, idx) => (
                        <span
                          key={`chk-${idx}`}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          <span>🔍 {c.staff_nama}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Belum ada washer yang ditugaskan</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  id={`btn-assign-washer-${trx.id}`}
                  type="button"
                  onClick={() => openAssignmentModal(trx)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{hasWashers ? 'Ganti / Atur Washer' : 'Tugaskan Washer'}</span>
                </button>

                <button
                  id={`btn-proceed-pay-${trx.id}`}
                  type="button"
                  onClick={() => onNavigateStep?.('pembayaran', trx.id)}
                  title="Lanjut Pembayaran"
                  className="py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition"
                >
                  <span>Bayar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ASSIGNMENT MODAL */}
      {activeModalTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Penugasan Tenaga Kerja Cuci
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {activeModalTrx.no_polisi} &bull; {activeModalTrx.paket_nama} ({activeModalTrx.tipe})
                </h3>
              </div>

              <button
                id="btn-close-assignment-modal"
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* SECTION: SELECT WASHERS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>PILIH WASHER (Bisa Lebih Dari 1 Orang)</span>
                  </label>
                  <span className="text-xs font-semibold text-slate-600">
                    {selectedWashers.length} Dipilih
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {washerStaff.map((staff) => {
                    const isSelected = selectedWashers.includes(staff.id);
                    // Find effective multiplier
                    const multObj = multipliers
                      .filter((m) => m.staff_id === staff.id && m.berlaku_mulai <= activeModalTrx.tanggal)
                      .sort(
                        (a, b) =>
                          new Date(b.berlaku_mulai).getTime() - new Date(a.berlaku_mulai).getTime()
                      )[0];
                    const multPercent = multObj ? Number(multObj.multiplier) : 0;

                    return (
                      <button
                        key={staff.id}
                        id={`btn-toggle-washer-${staff.id}`}
                        type="button"
                        onClick={() => toggleWasher(staff.id)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">{staff.nama}</p>
                            <p className="text-[10px] text-slate-600">Role: Washer</p>
                          </div>
                        </div>

                        {multPercent > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            +{multPercent}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 shrink-0">0%</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: SELECT CHECKERS */}
              {checkerStaff.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <span>CHECKER (Opsional)</span>
                    </label>
                    <span className="text-[11px] text-slate-600">
                      *Checker dibagi rata tanpa multiplier
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {checkerStaff.map((staff) => {
                      const isSelected = selectedCheckers.includes(staff.id);
                      return (
                        <button
                          key={staff.id}
                          id={`btn-toggle-checker-${staff.id}`}
                          type="button"
                          onClick={() => toggleChecker(staff.id)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-1 ring-blue-600'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{staff.nama}</p>
                              <p className="text-[10px] text-slate-600">Role: Checker</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVE COMMISSION BREAKDOWN PREVIEW */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Simulasi Perhitungan Komisi</span>
                  </span>
                  {calcLoading && (
                    <span className="text-[10px] text-slate-600">Menghitung...</span>
                  )}
                </div>

                {calcPreview.length > 0 ? (
                  <div className="space-y-2">
                    {calcPreview.map((item, idx) => {
                      const staff = staffList.find((s) => s.id === item.staff_id);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{staff?.nama}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 capitalize">
                              {item.peran}
                            </span>
                            {item.multiplier !== undefined && item.multiplier > 0 && (
                              <span className="text-[10px] font-bold text-amber-700">
                                (+{item.multiplier}%)
                              </span>
                            )}
                          </div>
                          <span className="font-black text-emerald-700">
                            Rp {formatNominal(item.komisi)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">
                    Pilih minimal 1 washer untuk melihat estimasi pembagian komisi.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-assignment-modal"
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <button
                id="btn-save-assignment-modal"
                type="button"
                disabled={isSavingAssignment}
                onClick={handleSaveAssignment}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingAssignment ? 'Menyimpan...' : 'Simpan Penugasan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
