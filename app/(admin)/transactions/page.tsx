'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  voidTransaction,
  getPriceList,
  getVehicleCategories,
  getStaffList,
  getStaffMultipliers,
  getTransactionStaff,
  getCustomerByNopol,
  addCustomer,
} from '@/lib/db';
import { formatNominal, parseNominal, formatDate } from '@/lib/format';
import {
  Transaction,
  PriceList,
  VehicleCategory,
  Staff,
  StaffMultiplier,
  TransactionStaff,
  Customer,
} from '@/types/database';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  DollarSign,
  Car,
  Users,
  CreditCard,
  Banknote,
  Percent,
  AlertCircle,
  X,
  Edit2,
  ShieldAlert,
  Info,
} from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const isOwnerOrSystemOwner = user?.role === 'owner' || user?.role === 'sistem_owner';
  const isKasirOrAdmin = user?.role === 'admin' || user?.role === 'spv' || isOwnerOrSystemOwner;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<PriceList[]>([]);
  const [vehicles, setVehicles] = useState<VehicleCategory[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [multipliers, setMultipliers] = useState<StaffMultiplier[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<TransactionStaff[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editTrx, setEditTrx] = useState<Transaction | null>(null);
  const [voidModalTrx, setVoidModalTrx] = useState<Transaction | null>(null);
  const [voidAlasan, setVoidAlasan] = useState<string>('');
  const [voiding, setVoiding] = useState<boolean>(false);

  // Form State (Input Transaksi)
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [noPolisiInput, setNoPolisiInput] = useState<string>('');
  const [nopolError, setNopolError] = useState<string | null>(null);

  // Customer Data State
  const [customerFound, setCustomerFound] = useState<Customer | null>(null);
  const [customerNama, setCustomerNama] = useState<string>('');
  const [customerHp, setCustomerHp] = useState<string>('');
  const [customerIntensity, setCustomerIntensity] = useState<number>(1);
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);

  // Cascading Selection State
  const [selectedKendaraan, setSelectedKendaraan] = useState<string>('');
  const [selectedPaket, setSelectedPaket] = useState<string>('');
  const [selectedFasilitas, setSelectedFasilitas] = useState<string>('');
  const [selectedTipe, setSelectedTipe] = useState<string>('');

  const [selectedPriceId, setSelectedPriceId] = useState<number | ''>('');
  const [hargaCustom, setHargaCustom] = useState<string>('');
  const [isHargaCustom, setIsHargaCustom] = useState<boolean>(false);
  const [metodeBayar, setMetodeBayar] = useState<'Tunai' | 'Qris' | 'Promo' | 'Piutang'>('Tunai');
  const [keterangan, setKeterangan] = useState<string>('');
  const [selectedWashers, setSelectedWashers] = useState<number[]>([]);
  const [selectedCheckers, setSelectedCheckers] = useState<number[]>([]);

  // Feedback banner
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trxs, priceData, vehicleData, staffData, multiData, staffTrxData] = await Promise.all([
        getTransactions(),
        getPriceList(),
        getVehicleCategories(),
        getStaffList(),
        getStaffMultipliers(),
        getTransactionStaff(),
      ]);

      setTransactions(trxs);
      setPrices(priceData);
      setVehicles(vehicleData);
      setStaffList(staffData.filter((s) => s.aktif));
      setMultipliers(multiData);
      setStaffAssignments(staffTrxData);
    } catch (err) {
      console.error('Error loading transaction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Nopol Validation Regex: /^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$/i
  const nopolRegex = /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/i;

  const handleNopolChange = async (val: string) => {
    const upper = val.toUpperCase();
    setNoPolisiInput(upper);
    setNopolError(null);

    const clean = upper.trim();
    if (clean.length >= 4) {
      if (!nopolRegex.test(clean)) {
        setNopolError('Format Nopol salah! Contoh benar: B 1234 BSA atau K 4321 NN');
      }

      // Check existing customer
      const existingCust = await getCustomerByNopol(clean);
      if (existingCust) {
        setCustomerFound(existingCust);
        setCustomerNama(existingCust.nama || '');
        setCustomerHp(existingCust.hp || '');
        setCustomerIntensity(existingCust.total_kunjungan || 1);
        setIsNewCustomer(false);
      } else {
        setCustomerFound(null);
        setCustomerNama('');
        setCustomerHp('');
        setCustomerIntensity(1);
        setIsNewCustomer(true);
      }
    } else {
      setCustomerFound(null);
      setIsNewCustomer(false);
    }
  };

  // Cascading Options
  const availableKendaraan = useMemo(() => {
    const list = Array.from(
      new Set(prices.map((p) => p.kendaraan?.trim()).filter(Boolean) as string[])
    );
    return list;
  }, [prices]);

  const availablePaket = useMemo(() => {
    if (!selectedKendaraan) return [];
    const filtered = prices.filter((p) => p.kendaraan?.trim() === selectedKendaraan.trim());
    return Array.from(new Set(filtered.map((p) => p.paket?.trim()).filter(Boolean) as string[]));
  }, [prices, selectedKendaraan]);

  const availableFasilitas = useMemo(() => {
    if (!selectedKendaraan || !selectedPaket) return [];
    const filtered = prices.filter(
      (p) =>
        p.kendaraan?.trim() === selectedKendaraan.trim() &&
        p.paket?.trim() === selectedPaket.trim()
    );
    return Array.from(new Set(filtered.map((p) => p.fasilitas?.trim()).filter(Boolean) as string[]));
  }, [prices, selectedKendaraan, selectedPaket]);

  const availableTipe = useMemo(() => {
    if (!selectedKendaraan || !selectedPaket || !selectedFasilitas) return [];
    const filtered = prices.filter(
      (p) =>
        p.kendaraan?.trim() === selectedKendaraan.trim() &&
        p.paket?.trim() === selectedPaket.trim() &&
        p.fasilitas?.trim() === selectedFasilitas.trim()
    );
    return Array.from(new Set(filtered.map((p) => p.tipe?.trim()).filter(Boolean) as string[]));
  }, [prices, selectedKendaraan, selectedPaket, selectedFasilitas]);

  const handleKendaraanChange = (kendaraanVal: string) => {
    setSelectedKendaraan(kendaraanVal);
    setSelectedPaket('');
    setSelectedFasilitas('');
    setSelectedTipe('');
    setSelectedPriceId('');
    setHargaCustom('');
    setIsHargaCustom(false);
  };

  const handlePaketChange = (paketVal: string) => {
    setSelectedPaket(paketVal);
    setSelectedFasilitas('');
    setSelectedTipe('');
    setSelectedPriceId('');
    setHargaCustom('');
    setIsHargaCustom(false);
  };

  const handleFasilitasChange = (fasilitasVal: string) => {
    setSelectedFasilitas(fasilitasVal);
    setSelectedTipe('');
    setSelectedPriceId('');
    setHargaCustom('');
    setIsHargaCustom(false);
  };

  const handleTipeChange = (tipeVal: string) => {
    setSelectedTipe(tipeVal);
    if (!tipeVal) {
      setSelectedPriceId('');
      setHargaCustom('');
      setIsHargaCustom(false);
      return;
    }

    const matched = prices.find(
      (p) =>
        p.kendaraan?.trim() === selectedKendaraan.trim() &&
        p.paket?.trim() === selectedPaket.trim() &&
        p.fasilitas?.trim() === selectedFasilitas.trim() &&
        p.tipe?.trim() === tipeVal.trim()
    );

    if (matched) {
      setSelectedPriceId(matched.id);
      setHargaCustom(String(matched.harga));
      setIsHargaCustom(false);
    } else {
      setSelectedPriceId('');
      setHargaCustom('');
      setIsHargaCustom(false);
    }
  };

  // Selected Price Object
  const currentPrice = useMemo(() => {
    if (!selectedPriceId) return null;
    return prices.find((p) => p.id === Number(selectedPriceId)) || null;
  }, [selectedPriceId, prices]);

  // Update default price when selectedPriceId changes
  useEffect(() => {
    if (currentPrice) {
      setHargaCustom(String(currentPrice.harga));
      setIsHargaCustom(false);
    }
  }, [currentPrice]);

  const availableWashers = useMemo(() => {
    return staffList.filter((s) => s.role === 'washer' || s.role === 'leader');
  }, [staffList]);

  const availableCheckers = useMemo(() => {
    return staffList.filter((s) => s.role === 'checker' || s.role === 'leader');
  }, [staffList]);

  // Calculate commission per staff with multiplier
  const calculateCommissionForStaff = (staffId: number, baseNominal: number, dateStr: string) => {
    const staffMultis = multipliers
      .filter((m) => m.staff_id === staffId && (m.berlaku_mulai || m.tanggal || '') <= dateStr)
      .sort((a, b) => (b.berlaku_mulai || b.tanggal || '').localeCompare(a.berlaku_mulai || a.tanggal || ''));

    if (staffMultis.length === 0) return Math.round(baseNominal);
    const m = staffMultis[0].multiplier;
    const factor = m > 1 ? (100 + m) / 100 : 1;
    return Math.round(baseNominal * factor);
  };

  // Submit New Transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNopol = noPolisiInput.toUpperCase().trim();
    if (!nopolRegex.test(cleanNopol)) {
      setFormError('Format Nomor Polisi wajib: HURUF + spasi + ANGKA + spasi + HURUF (Contoh: B 1234 BSA)');
      return;
    }

    if (!currentPrice) {
      setFormError('Silakan pilih paket layanan terlebih dahulu.');
      return;
    }

    if (selectedWashers.length === 0) {
      setFormError('Mohon pilih minimal 1 petugas Washer.');
      return;
    }

    if (isNewCustomer && (!customerNama.trim() || !customerHp.trim())) {
      setFormError('Customer baru wajib mengisi Nama dan Nomor HP.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Resolve or create customer
      let customerId = customerFound?.id;
      if (!customerId) {
        const newCust = await addCustomer({
          nopol: cleanNopol,
          nama: customerNama.trim(),
          hp: customerHp.trim(),
          kendaraan: currentPrice.kendaraan,
          tier: 'reguler',
          created_at: new Date().toISOString(),
        });
        customerId = newCust.id;
      }

      // 2. Resolve pricing & commission from price_list (COMMISSION IS CALCULATED FROM STANDARD PRICE LIST, NOT OVERRIDDEN PRICE)
      const baseHarga = parseNominal(hargaCustom) || currentPrice.harga;
      const hargaStandar = currentPrice.harga;
      const hargaDisesuaikan = baseHarga !== hargaStandar;

      // Fetch or fallback komisi per role from price_list_komisi or legacy fields
      const komisiWasherTotal = currentPrice.komisi_washer || 10000;
      const komisiCheckerTotal = currentPrice.komisi_checker || 3000;

      const baseKomisiWasherPerPerson = komisiWasherTotal / selectedWashers.length;
      const baseKomisiCheckerPerPerson =
        selectedCheckers.length > 0 ? komisiCheckerTotal / selectedCheckers.length : 0;

      const staffPayload = [
        ...selectedWashers.map((wId) => ({
          staff_id: wId,
          peran: 'washer',
          komisi: calculateCommissionForStaff(wId, baseKomisiWasherPerPerson, tanggal),
        })),
        ...selectedCheckers.map((cId) => ({
          staff_id: cId,
          peran: 'checker',
          komisi: calculateCommissionForStaff(cId, baseKomisiCheckerPerPerson, tanggal),
        })),
      ];

      if (editTrx) {
        // Edit existing transaction (same day & aktif)
        await updateTransaction(
          editTrx.id,
          {
            tanggal,
            customer_id: customerId,
            price_list_id: currentPrice.id,
            harga: baseHarga,
            metode_bayar: metodeBayar,
            keterangan: keterangan.trim() || null,
          },
          staffPayload
        );
        setSuccessMessage(`Transaksi ${editTrx.no_transaksi} berhasil diperbarui.`);
      } else {
        // Add new transaction
        const nowTime = new Date().toTimeString().split(' ')[0];
        await addTransaction(
          {
            tanggal,
            waktu: nowTime,
            customer_id: customerId,
            price_list_id: currentPrice.id,
            harga: baseHarga,
            metode_bayar: metodeBayar,
            keterangan: keterangan.trim() || null,
            kasir_id: user?.id || null,
            status: 'aktif',
          },
          staffPayload
        );

        setSuccessMessage(
          `Transaksi berhasil dicatat: ${cleanNopol} - ${currentPrice.paket} (${formatNominal(baseHarga)})`
        );
      }

      // Reset form
      setNoPolisiInput('');
      setCustomerFound(null);
      setCustomerNama('');
      setCustomerHp('');
      setSelectedKendaraan('');
      setSelectedPaket('');
      setSelectedFasilitas('');
      setSelectedTipe('');
      setSelectedPriceId('');
      setHargaCustom('');
      setIsHargaCustom(false);
      setKeterangan('');
      setSelectedWashers([]);
      setSelectedCheckers([]);
      setIsModalOpen(false);
      setEditTrx(null);

      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error submitting transaction:', err);
      setFormError('Terjadi kesalahan saat menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (trx: Transaction) => {
    setEditTrx(trx);
    setTanggal(trx.tanggal);
    setNoPolisiInput(trx.no_polisi || '');

    const pItem = prices.find((p) => p.id === trx.price_list_id);
    if (pItem) {
      setSelectedKendaraan(pItem.kendaraan);
      setSelectedPaket(pItem.paket);
      setSelectedFasilitas(pItem.fasilitas);
      setSelectedTipe(pItem.tipe);
      setSelectedPriceId(pItem.id);
      setHargaCustom(String(trx.harga));
      setIsHargaCustom(trx.harga !== pItem.harga);
    } else {
      setSelectedKendaraan(trx.kendaraan || '');
      setSelectedPaket(trx.paket_nama || '');
      setSelectedFasilitas('');
      setSelectedTipe(trx.tipe || '');
      setSelectedPriceId(trx.price_list_id || '');
      setHargaCustom(String(trx.harga));
      setIsHargaCustom(false);
    }

    setMetodeBayar(trx.metode_bayar as any);
    setKeterangan(trx.keterangan || '');
    setCustomerNama(trx.customer_nama || '');
    setCustomerHp(trx.customer_hp || '');

    // Load assigned staff
    const assigned = staffAssignments.filter((s) => s.transaction_id === trx.id);
    setSelectedWashers(assigned.filter((s) => s.peran === 'washer').map((s) => s.staff_id));
    setSelectedCheckers(assigned.filter((s) => s.peran === 'checker').map((s) => s.staff_id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenVoid = (trx: Transaction) => {
    setVoidModalTrx(trx);
    setVoidAlasan('');
  };

  const executeVoid = async () => {
    if (!voidModalTrx || !voidAlasan.trim()) {
      alert('Alasan void wajib diisi.');
      return;
    }

    setVoiding(true);
    try {
      await voidTransaction(voidModalTrx.id, voidAlasan.trim(), user?.id || null);
      setSuccessMessage(`Transaksi ${voidModalTrx.no_transaksi} berhasil di-void.`);
      setVoidModalTrx(null);
      setVoidAlasan('');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      alert('Gagal melakukan void transaksi.');
    } finally {
      setVoiding(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        (t.no_transaksi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.no_polisi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.paket_nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.customer_nama || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchPay = filterPayment === 'all' || t.metode_bayar === filterPayment;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;

      return matchSearch && matchPay && matchStatus;
    });
  }, [transactions, searchQuery, filterPayment, filterStatus]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#0A2A5E]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Transaksi Kasir & Riwayat Hari Ini
                </h1>
                <p className="text-xs text-slate-500">
                  Input transaksi cuci, validasi nopol, override harga, & pembagian komisi washer/checker.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setEditTrx(null);
              setTanggal(todayStr);
              setNoPolisiInput('');
              setNopolError(null);
              setCustomerFound(null);
              setCustomerNama('');
              setCustomerHp('');
              setSelectedKendaraan('');
              setSelectedPaket('');
              setSelectedFasilitas('');
              setSelectedTipe('');
              setSelectedPriceId('');
              setHargaCustom('');
              setIsHargaCustom(false);
              setMetodeBayar('Tunai');
              setKeterangan('');
              setSelectedWashers([]);
              setSelectedCheckers([]);
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#EA580C] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Input Transaksi Baru
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nopol, no.trx, nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0A2A5E] focus:outline-none"
              />
            </div>

            <div>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
              >
                <option value="all">Semua Metode Bayar</option>
                <option value="Tunai">Tunai</option>
                <option value="Qris">QRIS</option>
                <option value="Promo">Promo</option>
                <option value="Piutang">Piutang</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
              >
                <option value="all">Semua Status (Aktif / Void)</option>
                <option value="aktif">Aktif Saja</option>
                <option value="void">Void Saja</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Daftar Transaksi ({filteredTransactions.length})
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Kasir: {user?.nama}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#0A2A5E] text-white uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3.5">No. Transaksi</th>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-4 py-3.5">No. Polisi</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Paket Layanan</th>
                  <th className="px-4 py-3.5">Metode</th>
                  <th className="px-4 py-3.5 text-right">Harga (tanpa Rp)</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      Memuat data transaksi...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data transaksi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((trx) => {
                    const isToday = trx.tanggal === todayStr;
                    const isActive = trx.status === 'aktif';
                    return (
                      <tr key={trx.id} className={`hover:bg-slate-50 transition-colors ${!isActive ? 'bg-red-50/40 text-slate-400' : ''}`}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{trx.no_transaksi}</td>
                        <td className="px-4 py-3">{formatDate(trx.tanggal)}</td>
                        <td className="px-4 py-3 font-bold text-[#0A2A5E]">{trx.no_polisi}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{trx.customer_nama || '-'}</div>
                          <div className="text-[10px] text-slate-400">{trx.customer_hp || ''}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {trx.paket_nama}
                          {trx.harga_disesuaikan && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                              Harga Disesuaikan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                            {trx.metode_bayar}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                          {formatNominal(trx.harga)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              AKTIF
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800" title="Void">
                              VOID
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit only allowed if same day and active */}
                            {isActive && isToday && (
                              <button
                                onClick={() => handleOpenEdit(trx)}
                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                title="Edit Transaksi Hari Ini"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Void only allowed by Owner / Sistem Owner */}
                            {isActive && isOwnerOrSystemOwner && (
                              <button
                                onClick={() => handleOpenVoid(trx)}
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                title="Void Transaksi (Owner Only)"
                              >
                                <ShieldAlert className="h-4 w-4" />
                              </button>
                            )}
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

        {/* Modal: Input / Edit Transaksi */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-[#0A2A5E] flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#F97316]" />
                  {editTrx ? `Edit Transaksi (${editTrx.no_transaksi})` : 'Input Transaksi Kasir Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tanggal & Nopol Customer */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Nopol with Strict Format Validation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Polisi (HURUF + ANGKA + HURUF) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="B 1234 BSA"
                      value={noPolisiInput}
                      onChange={(e) => handleNopolChange(e.target.value)}
                      className={`w-full rounded-xl border py-2.5 px-3 text-xs uppercase font-bold text-slate-900 focus:outline-none ${
                        nopolError ? 'border-red-500 bg-red-50/30' : 'border-slate-300 focus:border-[#0A2A5E]'
                      }`}
                      required
                    />
                    {nopolError && <p className="text-[10px] text-red-600 mt-1 font-semibold">{nopolError}</p>}
                  </div>

                  {/* Tanggal Transaksi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Customer Lookup Info Banner */}
                {noPolisiInput.trim().length >= 4 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0A2A5E] flex items-center gap-1.5">
                        <Car className="h-4 w-4 text-blue-600" />
                        {customerFound ? 'Customer Terdaftar (Auto-Fill)' : 'Customer Baru (Wajib Isi Nama & HP)'}
                      </span>
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Total Kunjungan: {customerIntensity}x
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Nama Customer</label>
                        <input
                          type="text"
                          placeholder="Nama lengkap..."
                          value={customerNama}
                          onChange={(e) => setCustomerNama(e.target.value)}
                          readOnly={Boolean(customerFound)}
                          className={`w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none ${
                            customerFound ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-white focus:border-[#0A2A5E]'
                          }`}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">No. HP / WhatsApp</label>
                        <input
                          type="text"
                          placeholder="08123456789"
                          value={customerHp}
                          onChange={(e) => setCustomerHp(e.target.value)}
                          readOnly={Boolean(customerFound)}
                          className={`w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none ${
                            customerFound ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-white focus:border-[#0A2A5E]'
                          }`}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Cascading Dropdowns: Kendaraan -> Paket -> Fasilitas -> Tipe */}
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* 1. KENDARAAN */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        1. Kendaraan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedKendaraan}
                        onChange={(e) => handleKendaraanChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
                        required
                      >
                        <option value="">-- Pilih Kendaraan --</option>
                        {availableKendaraan.map((kend) => (
                          <option key={kend} value={kend}>
                            {kend}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. PAKET */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        2. Paket Layanan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedPaket}
                        onChange={(e) => handlePaketChange(e.target.value)}
                        disabled={!selectedKendaraan}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-[#0A2A5E] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">
                          {!selectedKendaraan ? '-- Pilih Kendaraan Dulu --' : '-- Pilih Paket Layanan --'}
                        </option>
                        {availablePaket.map((pkt) => (
                          <option key={pkt} value={pkt}>
                            {pkt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. FASILITAS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        3. Fasilitas <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedFasilitas}
                        onChange={(e) => handleFasilitasChange(e.target.value)}
                        disabled={!selectedPaket}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-[#0A2A5E] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">
                          {!selectedPaket ? '-- Pilih Paket Dulu --' : '-- Pilih Fasilitas --'}
                        </option>
                        {availableFasilitas.map((fas) => (
                          <option key={fas} value={fas}>
                            {fas}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. TIPE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        4. Tipe Kendaraan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTipe}
                        onChange={(e) => handleTipeChange(e.target.value)}
                        disabled={!selectedFasilitas}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-[#0A2A5E] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">
                          {!selectedFasilitas ? '-- Pilih Fasilitas Dulu --' : '-- Pilih Tipe Kendaraan --'}
                        </option>
                        {availableTipe.map((tp) => (
                          <option key={tp} value={tp}>
                            {tp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ringkasan Pilihan: Kendaraan | Paket | Fasilitas | Tipe | Harga */}
                  {selectedKendaraan && selectedPaket && selectedFasilitas && selectedTipe && currentPrice && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A2A5E] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Ringkasan Pilihan
                        </span>
                        <span className="text-xs font-extrabold text-[#0A2A5E]">
                          Rp {formatNominal(currentPrice.harga)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                        <span className="rounded-md bg-white px-2 py-0.5 font-bold text-[#0A2A5E] border border-blue-200 shadow-xs">
                          {selectedKendaraan}
                        </span>
                        <span className="text-slate-400 font-bold">|</span>
                        <span className="rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 border border-blue-200 shadow-xs">
                          {selectedPaket}
                        </span>
                        <span className="text-slate-400 font-bold">|</span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-slate-600 border border-blue-200 shadow-xs text-[11px]">
                          {selectedFasilitas}
                        </span>
                        <span className="text-slate-400 font-bold">|</span>
                        <span className="rounded-md bg-white px-2 py-0.5 font-bold text-slate-900 border border-blue-200 shadow-xs">
                          {selectedTipe}
                        </span>
                        <span className="text-slate-400 font-bold">|</span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-300">
                          Rp {formatNominal(currentPrice.harga)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. BIAYA / HARGA (Otomatis & Manual Override) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Biaya / Harga (Rp) <span className="text-red-500">*</span>
                    </label>
                    {isHargaCustom && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                        Harga disesuaikan
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-xs font-bold text-slate-500">Rp</span>
                    </div>
                    <input
                      type="text"
                      disabled={!currentPrice}
                      placeholder={!currentPrice ? 'Otomatis terisi setelah memilih tipe' : '0'}
                      value={hargaCustom ? formatNominal(hargaCustom) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setHargaCustom(val);
                        setIsHargaCustom(currentPrice ? Number(val) !== currentPrice.harga : false);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-extrabold text-slate-900 focus:border-[#0A2A5E] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                  {currentPrice ? (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Harga standar price list: <span className="font-semibold text-slate-700">Rp {formatNominal(currentPrice.harga)}</span>.
                      {isHargaCustom && (
                        <span className="text-amber-700 font-medium ml-1">
                          (Komisi washer & checker tetap dihitung dari standar price list)
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pilih Kendaraan, Paket, Fasilitas, dan Tipe terlebih dahulu untuk menampilkan harga.
                    </p>
                  )}
                </div>

                {/* 6. WASHER & 7. CHECKER */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Petugas Washer <span className="text-red-500">*</span>{' '}
                      <span className="text-[10px] font-normal text-slate-500">(Bisa pilih &gt; 1, komisi dibagi rata)</span>
                    </label>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-300 p-2 space-y-1 bg-white">
                      {availableWashers.length === 0 ? (
                        <p className="text-xs text-slate-400 p-2">Tidak ada washer aktif</p>
                      ) : (
                        availableWashers.map((w) => (
                          <label
                            key={w.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              selectedWashers.includes(w.id) ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedWashers.includes(w.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedWashers([...selectedWashers, w.id]);
                                else setSelectedWashers(selectedWashers.filter((id) => id !== w.id));
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-[#0A2A5E] focus:ring-[#0A2A5E]"
                            />
                            <span className="font-semibold text-slate-800">{w.nama}</span>
                            <span className="text-[10px] text-slate-400">({w.role})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Petugas Checker <span className="text-[10px] font-normal text-slate-500">(Opsional)</span>
                    </label>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-300 p-2 space-y-1 bg-white">
                      {availableCheckers.length === 0 ? (
                        <p className="text-xs text-slate-400 p-2">Tidak ada checker aktif</p>
                      ) : (
                        availableCheckers.map((c) => (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              selectedCheckers.includes(c.id) ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCheckers.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCheckers([...selectedCheckers, c.id]);
                                else setSelectedCheckers(selectedCheckers.filter((id) => id !== c.id));
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-[#0A2A5E] focus:ring-[#0A2A5E]"
                            />
                            <span className="font-semibold text-slate-800">{c.nama}</span>
                            <span className="text-[10px] text-slate-400">({c.role})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 8. METODE PEMBAYARAN & 9. KETERANGAN */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Metode Pembayaran <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={metodeBayar}
                      onChange={(e) => setMetodeBayar(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
                      required
                    >
                      <option value="Tunai">Tunai</option>
                      <option value="Qris">QRIS</option>
                      <option value="Promo">Promo</option>
                      <option value="Piutang">Piutang</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Keterangan <span className="text-[10px] font-normal text-slate-500">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan khusus transaksi..."
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-800 focus:border-[#0A2A5E] focus:outline-none"
                    />
                  </div>
                </div>

                {/* 10. SIMPAN TRANSAKSI */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !currentPrice || selectedWashers.length === 0}
                    className="rounded-xl bg-[#F97316] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Menyimpan...' : editTrx ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Void Transaction (Owner Only) */}
        {voidModalTrx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Konfirmasi Void Transaksi ({voidModalTrx.no_transaksi})
                </h3>
                <button onClick={() => setVoidModalTrx(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan melakukan <strong className="text-slate-900">Void</strong> pada transaksi plat nomor <strong className="text-[#0A2A5E]">{voidModalTrx.no_polisi}</strong> senilai <strong className="text-slate-900">Rp {formatNominal(voidModalTrx.harga)}</strong>. Transaksi yang di-void tidak akan dihapus permanen tetapi otomatis dikeluarkan dari laporan omzet & komisi.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Void Wajib Diisi *</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Salah input nominal harga / batal cuci karena antrian..."
                  value={voidAlasan}
                  onChange={(e) => setVoidAlasan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidModalTrx(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={voiding || !voidAlasan.trim()}
                  onClick={executeVoid}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {voiding ? 'Memproses Void...' : 'Ya, Lakukan Void'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
