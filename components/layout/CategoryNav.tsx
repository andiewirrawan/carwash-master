'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

export interface CategoryItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  badgeColor?: string;
}

interface CategoryNavProps {
  title: string;
  items: CategoryItem[];
  activeId?: string;
}

export function CategoryNav({ title, items, activeId }: CategoryNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1 w-full sm:w-64 shrink-0">
      <div className="px-3 py-2">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = activeId === item.id || (item.href && pathname === item.href);
          const Icon = item.icon;

          const content = (
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-[#0A2A5E] text-white shadow-xs' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-1 items-center justify-between">
                <span className={`text-sm font-semibold transition-colors ${
                  isActive ? 'text-slate-900' : 'text-slate-600'
                }`}>
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.badgeColor || 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`block w-full rounded-xl px-3 py-2.5 transition-all ${
                  isActive
                    ? 'bg-white shadow-sm ring-1 ring-slate-200 border-l-4 border-l-[#F97316]'
                    : 'hover:bg-slate-50'
                }`}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`block w-full text-left rounded-xl px-3 py-2.5 transition-all ${
                isActive
                  ? 'bg-white shadow-sm ring-1 ring-slate-200 border-l-4 border-l-[#F97316]'
                  : 'hover:bg-slate-50'
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
