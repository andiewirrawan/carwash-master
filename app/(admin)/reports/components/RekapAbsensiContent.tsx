'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceList, getStaffList } from '@/lib/db';
import { Attendance, Staff } from '@/types/database';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export function RekapAbsensiContent() {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aData, sData] = await Promise.all([
        getAttendanceList(startDate, endDate),
        getStaffList()
      ]);
      setAttendance(aData);
      setStaff(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-hidden"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Nama Staff</th>
                <th className="px-5 py-4 text-center">Hadir</th>
                <th className="px-5 py-4 text-center">Sakit</th>
                <th className="px-5 py-4 text-center">Izin</th>
                <th className="px-5 py-4 text-center">Alpa</th>
                <th className="px-5 py-4 text-center">Total Hari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0A2A5E] border-t-transparent" />
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">Tidak ada data staff.</td>
                </tr>
              ) : (
                staff.map((s) => {
                  const sAtt = attendance.filter(a => a.staff_id === s.id);
                  const hadir = sAtt.filter(a => a.status === 'Hadir').length;
                  const sakit = sAtt.filter(a => a.status === 'Sakit').length;
                  const izin = sAtt.filter(a => a.status === 'Izin').length;
                  const alpa = sAtt.filter(a => a.status === 'Alpa').length;
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">{s.nama}</td>
                      <td className="px-5 py-4 text-center font-bold text-emerald-600">{hadir}</td>
                      <td className="px-5 py-4 text-center font-bold text-amber-600">{sakit}</td>
                      <td className="px-5 py-4 text-center font-bold text-blue-600">{izin}</td>
                      <td className="px-5 py-4 text-center font-bold text-rose-600">{alpa}</td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-slate-400">{sAtt.length}</td>
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
