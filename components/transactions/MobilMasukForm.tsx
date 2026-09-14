'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  validateNopolFormat,
  searchCustomerWithIntensity,
  createMobilMasuk,
  getPriceList,
  isDayClosedForCashier,
} from '@/lib/db';
import { PriceList, Customer } from '@/types/database';
import { formatNominal } from '@/lib/format';
import {
  Car,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Tag,
  Lock,
  Unlock,
  RotateCcw,
  ArrowRight,
  Info,
} from 'lucide-react';

interface MobilMasukFormProps {
  onSuccessNavigate?: (step: 'sedang-dikerjakan' | 'mobil-masuk', createdTrxId?: number) => void;
}

export function MobilMasukForm({ onSuccessNavigate }: MobilMasukFormProps) {
  const { user } = useAuth();

  const [prices, setPrices] = useState<PriceList[]>([]);
  const [loadingPrices, setLoadingPrices] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isClosedToday, setIsClosedToday] = useState<boolean>(false);

  // License plate & customer search
  const [nopol, setNopol] = useState<string>('');
  const [nopolError, setNopolError] = useState<string | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState<boolean>(false);
  const [customerData, setCustomerData] = useState<{
    found: boolean;
    customer?: Customer;
    intensitas: number;
  } | null>(null);
  const [isLockedCustomerFields, setIsLockedCustomerFields] = useState<boolean>(false);

  // Customer input fields
  const [nama, setNama] = useState<string>('');
  const [hp, setHp] = useState<string>('');

  // Cascading dropdowns
  const [selectedKendaraan, setSelectedKendaraan] = useState<string>('');
  const [selectedPaket, setSelectedPaket] = useState<string>('');
  const [selectedFasilitas, setSelectedFasilitas] = useState<string>('');
  const [selectedTipe, setSelectedTipe] = useState<string>('');

  // Pricing & notes
  const [hargaCustom, setHargaCustom] = useState<string>('');
  const [isHargaCustom, setIsHargaCustom] = useState<boolean>(false);
  const [keterangan, setKeterangan] = useState<string>('');

  // Success state modal / alert
  const [successInfo, setSuccessInfo] = useState<{
    noTransaksi: string;
    nopol: string;
    harga: number;
    trxId: number;
  } | null>(null);

  // Today's date
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Load price list & check daily closing status for current cashier
  useEffect(() => {
    async function init() {
      setLoadingPrices(true);
      try {
        const pList = await getPriceList();
        setPrices(pList);

        if (user?.id) {
          const closed = await isDayClosedForCashier(today, user.id);
          setIsClosedToday(closed);
        }
      } catch (err) {
        console.error('Failed initializing MobilMasukForm:', err);
      } finally {
        setLoadingPrices(false);
      }
    }
    init();
  }, [user, today]);

  // Handle Nopol change & Auto-search
  const handleNopolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    setNopol(raw);
    setNopolError(null);
  };

  const performCustomerSearch = async () => {
    if (!nopol.trim()) {
      setCustomerData(null);
      return;
    }

    const val = validateNopolFormat(nopol);
    if (!val.valid) {
      setNopolError(val.error || 'Format nomor polisi tidak valid');
      return;
    }

    setNopol(val.formatted);
    setNopolError(null);
    setSearchingCustomer(true);

    try {
      const result = await searchCustomerWithIntensity(val.formatted);
      setCustomerData(result);

      if (result.found && result.customer) {
        setNama(result.customer.nama || '');
        setHp(result.customer.hp || '');
        setIsLockedCustomerFields(true);

        if (result.customer.kendaraan) {
          setSelectedKendaraan(result.customer.kendaraan);
        }
      } else {
        // New customer
        setIsLockedCustomerFields(false);
      }
    } catch (err) {
      console.error('Customer search error:', err);
    } finally {
      setSearchingCustomer(false);
    }
  };

  // Cascading options calculation
  const kendaraanOptions = useMemo(() => {
    const set = new Set<string>();
    prices.forEach((p) => {
      if (p.kendaraan) set.add(p.kendaraan);
    });
    return Array.from(set).sort();
  }, [prices]);

  const paketOptions = useMemo(() => {
    if (!selectedKendaraan) return [];
    const set = new Set<string>();
    prices
      .filter((p) => p.kendaraan === selectedKendaraan)
      .forEach((p) => {
        if (p.paket) set.add(p.paket);
      });
    return Array.from(set).sort();
  }, [prices, selectedKendaraan]);

  const fasilitasOptions = useMemo(() => {
    if (!selectedKendaraan || !selectedPaket) return [];
    const set = new Set<string>();
    prices
      .filter((p) => p.kendaraan === selectedKendaraan && p.paket === selectedPaket)
      .forEach((p) => {
        if (p.fasilitas) set.add(p.fasilitas);
      });
    return Array.from(set).sort();
  }, [prices, selectedKendaraan, selectedPaket]);

  const tipeOptions = useMemo(() => {
    if (!selectedKendaraan || !selectedPaket || !selectedFasilitas) return [];
    const set = new Set<string>();
    prices
      .filter(
        (p) =>
          p.kendaraan === selectedKendaraan &&
          p.paket === selectedPaket &&
          p.fasilitas === selectedFasilitas
      )
      .forEach((p) => {
        if (p.tipe) set.add(p.tipe);
      });
    return Array.from(set).sort();
  }, [prices, selectedKendaraan, selectedPaket, selectedFasilitas]);

  // Exact matching price list item
  const selectedPriceItem = useMemo(() => {
    if (!selectedKendaraan || !selectedPaket || !selectedFasilitas || !selectedTipe) {
      return null;
    }
    return (
      prices.find(
        (p) =>
          p.kendaraan === selectedKendaraan &&
          p.paket === selectedPaket &&
          p.fasilitas === selectedFasilitas &&
          p.tipe === selectedTipe
      ) || null
    );
  }, [prices, selectedKendaraan, selectedPaket, selectedFasilitas, selectedTipe]);

  // When standard price item changes, update custom price display if not manually touched
  useEffect(() => {
    if (selectedPriceItem && !isHargaCustom) {
      setHargaCustom(String(selectedPriceItem.harga));
    }
  }, [selectedPriceItem, isHargaCustom]);

  const resetForm = () => {
    setNopol('');
    setNopolError(null);
    setCustomerData(null);
    setNama('');
    setHp('');
    setIsLockedCustomerFields(false);
    setSelectedKendaraan('');
    setSelectedPaket('');
    setSelectedFasilitas('');
    setSelectedTipe('');
    setHargaCustom('');
    setIsHargaCustom(false);
    setKeterangan('');
    setSuccessInfo(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClosedToday) {
      alert('Shift Anda untuk hari ini sudah ditutup. Tidak dapat menambah transaksi baru.');
      return;
    }

    const nopolVal = validateNopolFormat(nopol);
    if (!nopolVal.valid) {
      setNopolError(nopolVal.error || 'Format nomor polisi tidak valid');
      return;
    }

    if (!nama.trim()) {
      alert('Nama customer wajib diisi!');
      return;
    }

    if (!hp.trim()) {
      alert('Nomor HP customer wajib diisi!');
      return;
    }

    if (!selectedPriceItem) {
      alert('Silakan lengkapi pemilihan Kendaraan, Paket, Fasilitas, dan Tipe!');
      return;
    }

    const finalHarga = Number(hargaCustom) || Number(selectedPriceItem.harga);
    if (finalHarga <= 0) {
      alert('Harga transaksi tidak boleh 0!');
      return;
    }

    if (!user?.id) {
      alert('Sesi kasir tidak valid. Silakan login ulang.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createMobilMasuk({
        nopol: nopolVal.formatted,
        nama: nama.trim(),
        hp: hp.trim(),
        kendaraan: selectedKendaraan,
        price_list_id: selectedPriceItem.id,
        harga: finalHarga,
        harga_standar: Number(selectedPriceItem.harga),
        harga_disesuaikan: isHargaCustom && finalHarga !== Number(selectedPriceItem.harga),
        keterangan: keterangan.trim() || undefined,
        kasir_id: user.id,
        tanggal: today,
      });

      setSuccessInfo({
        noTransaksi: created.no_transaksi || `TRX-${created.id}`,
        nopol: nopolVal.formatted,
        harga: finalHarga,
        trxId: created.id,
      });
    } catch (err: any) {
      console.error('Failed to create mobil masuk:', err);
      alert(`Gagal menyimpan transaksi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alert if Shift Closed */}
      {isClosedToday && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Shift Hari Ini Telah Ditutup</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Anda telah melakukan Tutup Hari. Untuk menambah transaksi baru pada tanggal ini, minta SPV/Owner untuk membuka kembali shift Anda pada menu Tutup Hari.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Modal / Banner */}
      {successInfo && (
        <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-500/30 text-emerald-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Mobil Berhasil Masuk Antrean
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {successInfo.nopol} &bull; {successInfo.noTransaksi}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tagihan: <span className="font-bold text-slate-800">Rp {formatNominal(successInfo.harga)}</span> &bull; Status:{' '}
                  <span className="font-bold text-amber-600">Sedang Dikerjakan (Belum ada Washer)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                id="btn-input-next-car"
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
              >
                Input Mobil Baru
              </button>
              <button
                id="btn-goto-assign-washer"
                type="button"
                onClick={() => onSuccessNavigate?.('sedang-dikerjakan', successInfo.trxId)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>Tugaskan Washer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                1
              </div>
              <h2 className="text-base font-bold text-slate-900">Form Mobil Masuk</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 ml-9">
              Catat kendaraan baru masuk, pilih paket cuci, lalu kirim ke antrean pengerjaan.
            </p>
          </div>

          <div className="text-right ml-9 sm:ml-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Kasir: {user?.nama || 'Petugas'}</span>
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* SECTION 1: NOMOR POLISI & CUSTOMER LOOKUP */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              NOMOR POLISI KENDARAAN <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  id="input-nopol-mobil-masuk"
                  type="text"
                  required
                  placeholder="Contoh: K 1234 NN atau B 123 BSA"
                  value={nopol}
                  onChange={handleNopolChange}
                  onBlur={performCustomerSearch}
                  className={`w-full px-4 py-3 text-base sm:text-lg font-mono font-black tracking-wider rounded-xl border transition ${
                    nopolError
                      ? 'border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md uppercase">
                    Plat Nomor
                  </span>
                </div>
              </div>

              <button
                id="btn-cek-customer-nopol"
                type="button"
                onClick={performCustomerSearch}
                disabled={searchingCustomer || !nopol.trim()}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition"
              >
                <Search className="w-4 h-4" />
                <span>{searchingCustomer ? 'Mengecek...' : 'Cek Pelanggan'}</span>
              </button>
            </div>

            {/* Error format helper */}
            {nopolError ? (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{nopolError}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-600 mt-1.5">
                Format baku: <strong>HURUF</strong> + spasi + <strong>ANGKA</strong> + spasi +{' '}
                <strong>HURUF</strong> (contoh: <code>K 1234 NN</code>)
              </p>
            )}

            {/* Customer Status Banner */}
            {customerData && (
              <div className="mt-3.5 p-3.5 rounded-xl border transition-all animate-in fade-in">
                {customerData.found && customerData.customer ? (
                  <div className="bg-emerald-50/70 border-emerald-200 rounded-lg p-3 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-emerald-800">
                            Pelanggan Terdaftar
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 uppercase">
                            Tier {customerData.customer.tier || 'Reguler'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-0.5">
                          Nama: <strong>{customerData.customer.nama}</strong> &bull; HP:{' '}
                          <strong>{customerData.customer.hp}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60">
                      <p className="text-[11px] text-emerald-700 font-semibold">Total Kunjungan (Intensitas)</p>
                      <p className="text-lg font-black text-emerald-900">
                        {customerData.intensitas}{' '}
                        <span className="text-xs font-bold text-emerald-700">kali selesai</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border-blue-200 rounded-lg p-3 text-blue-950 flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Pelanggan Baru Terdeteksi</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Plat nomor ini belum terdaftar. Silakan lengkapi Nama & Nomor HP di bawah.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: DATA CUSTOMER (NAMA & HP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  NAMA CUSTOMER <span className="text-red-500">*</span>
                </label>
                {customerData?.found && (
                  <button
                    type="button"
                    onClick={() => setIsLockedCustomerFields(!isLockedCustomerFields)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {isLockedCustomerFields ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Terkunci (Klik Edit)</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Mode Ubah</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                id="input-customer-nama"
                type="text"
                required
                placeholder="Contoh: Bpk. Sandi / Ibu Rina"
                value={nama}
                readOnly={isLockedCustomerFields}
                onChange={(e) => setNama(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition ${
                  isLockedCustomerFields
                    ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NOMOR HP / WHATSAPP <span className="text-red-500">*</span>
              </label>
              <input
                id="input-customer-hp"
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={hp}
                readOnly={isLockedCustomerFields}
                onChange={(e) => setHp(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition ${
                  isLockedCustomerFields
                    ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                }`}
              />
            </div>
          </div>

          {/* SECTION 3: CASCADING DROPDOWNS (KENDARAAN -> PAKET -> FASILITAS -> TIPE) */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                PILIH LAYANAN CUCI (CASCADING DROPDOWN)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Kendaraan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  1. Kendaraan <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-kendaraan"
                  required
                  value={selectedKendaraan}
                  onChange={(e) => {
                    setSelectedKendaraan(e.target.value);
                    setSelectedPaket('');
                    setSelectedFasilitas('');
                    setSelectedTipe('');
                  }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="">-- Pilih Kendaraan --</option>
                  {kendaraanOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Paket */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  2. Paket <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-paket"
                  required
                  disabled={!selectedKendaraan}
                  value={selectedPaket}
                  onChange={(e) => {
                    setSelectedPaket(e.target.value);
                    setSelectedFasilitas('');
                    setSelectedTipe('');
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border font-medium transition ${
                    !selectedKendaraan
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                  }`}
                >
                  <option value="">-- Pilih Paket --</option>
                  {paketOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Fasilitas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  3. Fasilitas <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-fasilitas"
                  required
                  disabled={!selectedPaket}
                  value={selectedFasilitas}
                  onChange={(e) => {
                    setSelectedFasilitas(e.target.value);
                    setSelectedTipe('');
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border font-medium transition ${
                    !selectedPaket
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                  }`}
                >
                  <option value="">-- Pilih Fasilitas --</option>
                  {fasilitasOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Tipe */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  4. Tipe / Ukuran <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-tipe"
                  required
                  disabled={!selectedFasilitas}
                  value={selectedTipe}
                  onChange={(e) => setSelectedTipe(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border font-medium transition ${
                    !selectedFasilitas
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                  }`}
                >
                  <option value="">-- Pilih Tipe --</option>
                  {tipeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: HARGA & KETERANGAN */}
          <div className="pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Harga Transaksi (Snapshot)
                  </span>
                  {isHargaCustom && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Harga Disesuaikan
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">
                    Rp {formatNominal(Number(hargaCustom) || 0)}
                  </p>
                  {selectedPriceItem && (
                    <p className="text-xs text-slate-600">
                      (Standar: Rp {formatNominal(selectedPriceItem.harga)})
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>
                    Komisi washer tetap mengacu pada daftar harga resmi dan tidak terpengaruh diskon.
                  </span>
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <input
                    id="checkbox-sesuaikan-harga"
                    type="checkbox"
                    checked={isHargaCustom}
                    onChange={(e) => {
                      setIsHargaCustom(e.target.checked);
                      if (!e.target.checked && selectedPriceItem) {
                        setHargaCustom(String(selectedPriceItem.harga));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="checkbox-sesuaikan-harga"
                    className="text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Sesuaikan Harga
                  </label>
                </div>

                {isHargaCustom && (
                  <div className="relative w-full sm:w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                      Rp
                    </span>
                    <input
                      id="input-harga-custom"
                      type="number"
                      min="0"
                      step="500"
                      value={hargaCustom}
                      onChange={(e) => setHargaCustom(e.target.value)}
                      placeholder="Nominal"
                      className="w-full pl-9 pr-3 py-2 text-sm font-bold rounded-lg border border-amber-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Keterangan */}
            <div className="mt-3.5">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Catatan / Keterangan (Opsional)
              </label>
              <input
                id="input-keterangan-mobil-masuk"
                type="text"
                placeholder="Contoh: Karpet belakang kotor pekat, minta poles spion, dll."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            id="btn-reset-form-mobil-masuk"
            type="button"
            onClick={resetForm}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Input</span>
          </button>

          <button
            id="btn-submit-mobil-masuk"
            type="submit"
            disabled={isSubmitting || isClosedToday || !selectedPriceItem || !nopol.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Car className="w-4 h-4" />
            <span>
              {isSubmitting ? 'Menyimpan Transaksi...' : 'Simpan & Masuk Antrean Cuci'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
