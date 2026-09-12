'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, UserCheck, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [username, setUsername] = useState<string>('wiro');
  const [password, setPassword] = useState<string>('wiro123');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await login(username, password);
    setSubmitting(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Login gagal.');
    }
  };

  const setPresetUser = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-[#0A2A5E] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F97316] text-white text-2xl font-black shadow-lg">
            BSA
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Carwash Master
          </h1>
          <p className="text-sm text-blue-200">
            Sistem Kasir & Management BSA Car Wash
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8 text-slate-800 border border-blue-100">
          <h2 className="text-lg font-bold text-[#0A2A5E] border-b border-slate-100 pb-3 mb-5">
            Masuk ke Sistem
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200 flex items-center gap-2">
              <span className="font-bold">x</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#F97316] py-3 text-sm font-bold text-white shadow-md hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Akun</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Login Cepat (Uji Akses Role):</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPresetUser('wiro', 'wiro123')}
                className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                  username === 'wiro'
                    ? 'border-[#F97316] bg-amber-50 text-amber-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Wiro</span>
                  {username === 'wiro' && <CheckCircle2 className="h-3.5 w-3.5 text-[#F97316]" />}
                </div>
                <div className="text-[10px] text-slate-500">sistem_owner (Full)</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser('owner', 'owner123')}
                className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                  username === 'owner'
                    ? 'border-[#F97316] bg-amber-50 text-amber-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Pak BSA</span>
                  {username === 'owner' && <CheckCircle2 className="h-3.5 w-3.5 text-[#F97316]" />}
                </div>
                <div className="text-[10px] text-slate-500">owner</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser('spv', 'spv123')}
                className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                  username === 'spv'
                    ? 'border-[#F97316] bg-amber-50 text-amber-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Siti SPV</span>
                  {username === 'spv' && <CheckCircle2 className="h-3.5 w-3.5 text-[#F97316]" />}
                </div>
                <div className="text-[10px] text-slate-500">spv (Keuangan)</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser('kasir', 'kasir123')}
                className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                  username === 'kasir'
                    ? 'border-[#F97316] bg-amber-50 text-amber-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Kasir 1</span>
                  {username === 'kasir' && <CheckCircle2 className="h-3.5 w-3.5 text-[#F97316]" />}
                </div>
                <div className="text-[10px] text-slate-500">admin (Kasir)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-blue-200">
          BSA Car Wash &copy; {new Date().getFullYear()} — Nominal: Ribuan titik (tanpa Rp) | Tanggal: dd/mm/yyyy
        </p>
      </div>
    </div>
  );
}
