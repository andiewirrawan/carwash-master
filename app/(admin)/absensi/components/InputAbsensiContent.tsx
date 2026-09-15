'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getStaffList, getAttendanceList, addAttendance, updateAttendance } from '@/lib/db';
import { Staff, Attendance, AttendanceStatus } from '@/types/database';
import { formatDateID } from '@/lib/format';
import {
  Calendar,
  Search,
  Users,
} from 'lucide-react';

export function InputAbsensiContent() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, aData] = await Promise.all([
        getStaffList(),
        getAttendanceList(date, date)
      ]);
      setStaffList(sData.filter(s => s.aktif));
      setAttendance(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (staffId: number, status: AttendanceStatus) => {
    setSavingId(staffId);
    try {
      const existing = attendance.find(a => a.staff_id === staffId);
      if (existing) {
        await updateAttendance(existing.id, { status });
      } else {
        await addAttendance({ staff_id: staffId, tanggal: date, status });
      }
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const filteredStaff = staffList.filter(s => s.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Pilih Tanggal:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold focus:outline-hidden"
            />
          </div>
        </div>
        <div className="text-xs font-medium text-slate-500">
          Staff Aktif: <span className="font-bold text-slate-900">{staffList.length}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-[#0A2A5E] focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Nama Staff</th>
                <th className="px-5 py-4 text-center">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={2} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-10 text-center text-slate-400">Tidak ada staff.</td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const current = attendance.find(a => a.staff_id === s.id)?.status;
                  const isSaving = savingId === s.id;
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                            {s.nama.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.nama}</p>
                            <p className="text-[11px] text-slate-500 capitalize">{s.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {(['Hadir', 'Sakit', 'Izin', 'Alpha'] as AttendanceStatus[]).map((st) => (
                            <button
                              key={st}
                              disabled={isSaving}
                              onClick={() => handleStatusChange(s.id, st)}
                              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                                current === st
                                  ? st === 'Hadir' ? 'bg-emerald-600 text-white shadow-sm' :
                                    st === 'Sakit' ? 'bg-blue-600 text-white shadow-sm' :
                                    st === 'Izin' ? 'bg-amber-600 text-white shadow-sm' :
                                    'bg-rose-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
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
    </div>
  );
}
