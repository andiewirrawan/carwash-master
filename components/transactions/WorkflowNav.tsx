'use client';

import React from 'react';
import { Car, Clock, Banknote, History, CheckCircle2 } from 'lucide-react';

export type WorkflowStep = 'mobil-masuk' | 'sedang-dikerjakan' | 'pembayaran' | 'riwayat-hari-ini' | 'tutup-hari';

interface WorkflowNavProps {
  activeStep: WorkflowStep;
  onChangeStep: (step: WorkflowStep) => void;
  countProses?: number;
  countPembayaran?: number;
  isClosedToday?: boolean;
}

export function WorkflowNav({
  activeStep,
  onChangeStep,
  countProses = 0,
  countPembayaran = 0,
  isClosedToday = false,
}: WorkflowNavProps) {
  const steps: Array<{
    id: WorkflowStep;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    {
      id: 'mobil-masuk',
      label: '1. Mobil Masuk',
      sublabel: 'Input Nopol & Cuci',
      icon: Car,
    },
    {
      id: 'sedang-dikerjakan',
      label: '2. Sedang Dikerjakan',
      sublabel: 'Tugaskan Washer',
      icon: Clock,
      badge: countProses > 0 ? countProses : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'pembayaran',
      label: '3. Pembayaran',
      sublabel: 'Kasir & Selesai',
      icon: Banknote,
      badge: countPembayaran > 0 ? countPembayaran : undefined,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'riwayat-hari-ini',
      label: 'Riwayat Hari Ini',
      sublabel: 'Audit & Edit',
      icon: History,
    },
    {
      id: 'tutup-hari',
      label: 'Tutup Hari',
      sublabel: isClosedToday ? 'Sudah Ditutup' : 'Closing Shift',
      icon: CheckCircle2,
      badge: isClosedToday ? 'Tutup' : 'Buka',
      badgeColor: isClosedToday ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700',
    },
  ];

  return (
    <div className="w-full bg-white rounded-2xl p-2 shadow-xs border border-slate-200 mb-6">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;

          return (
            <button
              key={step.id}
              id={`nav-step-${step.id}`}
              type="button"
              onClick={() => onChangeStep(step.id)}
              className={`flex-1 min-w-[140px] md:min-w-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold leading-tight truncate">{step.label}</p>
                  {step.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                        isActive ? 'bg-white text-blue-700' : step.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.badge}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-tight truncate mt-0.5 ${
                    isActive ? 'text-blue-100' : 'text-slate-600'
                  }`}
                >
                  {step.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
