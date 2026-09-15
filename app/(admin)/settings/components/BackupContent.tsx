'use client';

import React, { useState } from 'react';
import {
  getPriceList,
  getVehicleCategories,
  getStaffList,
  getStaffMultipliers,
  getUsersList,
  SUPABASE_MIGRATION_SQL,
} from '@/lib/db';
import {
  HardDrive,
  Check,
  Copy,
  Clock,
  FileCode,
  FileSpreadsheet,
  Database,
  ShieldCheck,
} from 'lucide-react';

export function BackupContent() {
  const [copied, setCopied] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    setExporting(true);
    setExportStatus('Mengumpulkan data tabel untuk export JSON 2 lapis...');
    try {
      const [prices, vehicles, staff, multipliers, users] = await Promise.all([
        getPriceList(),
        getVehicleCategories(),
        getStaffList(),
        getStaffMultipliers(),
        getUsersList(),
      ]);

      const dump = {
        meta: {
          app: 'Carwash Master (BSA Car Wash)',
          export_date: new Date().toISOString(),
          format_date: 'dd/mm/yyyy',
          format_nominal: 'ribuan titik tanpa Rp',
          backup_layer: '2nd Layer Independent Storage Dump',
        },
        tables: {
          price_list: prices,
          vehicle_categories: vehicles,
          staff: staff,
          staff_komisi_multiplier: multipliers,
          users: users,
        },
      };

      const dateStr = new Date().toISOString().split('T')[0];
      downloadFile(
        JSON.stringify(dump, null, 2),
        `bsa_carwash_backup_dump_${dateStr}.json`,
        'application/json'
      );
      setExportStatus('Export JSON 2 lapis berhasil diunduh!');
    } catch (err) {
      setExportStatus('Terjadi kesalahan saat membuat dump JSON.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    setExportStatus('Membuat CSV dump tabel utama...');
    try {
      const prices = await getPriceList();
      let csvContent = 'ID,Kendaraan,Paket,Fasilitas,Tipe,Harga,KomisiWasher,KomisiChecker\n';
      prices.forEach((p) => {
        csvContent += `"${p.id}","${p.kendaraan}","${p.paket}","${p.fasilitas}","${p.tipe}","${p.harga}","${p.komisi_washer}","${p.komisi_checker}"\n`;
      });

      const dateStr = new Date().toISOString().split('T')[0];
      downloadFile(
        csvContent,
        `bsa_price_list_${dateStr}.csv`,
        'text/csv;charset=utf-8;'
      );
      setExportStatus('Export CSV Price List berhasil diunduh!');
    } catch (err) {
      setExportStatus('Terjadi kesalahan saat membuat CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A2A5E] sm:text-2xl flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-[#F97316]" />
            Backup & Database Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Panduan Point-in-Time Recovery (PITR) Supabase & Export independen (JSON/CSV dump).
          </p>
        </div>
      </div>

      {/* 2-Layer Backup Overview Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Layer 1: Supabase PITR & Daily Backup */}
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#0A2A5E] font-bold text-sm">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Lapis 1: Supabase PITR & Daily Backup
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Aktifkan <strong className="text-slate-900">Point-in-Time Recovery (PITR)</strong> di Supabase project settings jika menggunakan paket Pro ke atas (memungkinkan restore database ke detik mana saja dalam 7 hari terakhir). Minimal aktifkan <strong className="text-slate-900">Daily Backup bawaan Supabase</strong> di free tier.
          </p>

          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900 border border-blue-100 space-y-1.5">
            <p className="font-semibold flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-700" /> Langkah Aktivasinya di Supabase Dashboard:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-[11px] text-blue-800">
              <li>Buka Supabase Console &gt; Project Settings &gt; Database</li>
              <li>Scroll ke bagian <strong>Backups</strong></li>
              <li>Klik <strong>Enable PITR</strong> (atau pastikan Physical Daily Backups status Active)</li>
            </ol>
          </div>
        </div>

        {/* Layer 2: Independent Storage Dump (CSV / JSON) */}
        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#0A2A5E] font-bold text-sm">
            <HardDrive className="h-5 w-5 text-[#F97316]" />
            Lapis 2: Export Manual ke Storage Terpisah
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Download dump tabel-tabel utama (<code className="font-bold text-amber-800">transactions</code>, <code className="font-bold text-amber-800">customers</code>, <code className="font-bold text-amber-800">price_list</code>, <code className="font-bold text-amber-800">staff</code>) ke file CSV/JSON tersimpan secara independen.
          </p>

          {/* Instant Manual Export Action */}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A2A5E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-900 transition-colors cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-amber-300" />
              <span>Export Full JSON Dump</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-200" />
              <span>Export CSV Price List</span>
            </button>
          </div>

          {exportStatus && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" /> {exportStatus}
            </p>
          )}
        </div>
      </div>

      {/* SQL Migration Script Copy Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#0A2A5E]" />
            <h3 className="text-sm font-bold text-[#0A2A5E]">
              Skema Database Supabase (SQL Migration Code)
            </h3>
          </div>
          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-500" />
                <span>Salin SQL Migration</span>
              </>
            )}
          </button>
        </div>

        <pre className="max-h-80 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400 leading-relaxed border border-slate-800">
          {SUPABASE_MIGRATION_SQL}
        </pre>
      </div>
    </div>
  );
}
