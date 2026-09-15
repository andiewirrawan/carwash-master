'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  LayoutDashboard,
  Database,
  Tag,
  Car,
  Users,
  Percent,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell,
  LogOut,
  Search,
  ShieldCheck,
  Server,
  HardDrive,
  Home,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Award,
  TrendingUp,
  CreditCard,
  Contact,
  CalendarDays,
  Banknote,
  Sparkles,
  Settings,
} from 'lucide-react';

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  minRole?: 'admin' | 'spv' | 'owner' | 'sistem_owner';
  subItems?: MenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    minRole: 'admin',
  },
  {
    title: 'Transaksi Kasir',
    href: '/transactions',
    icon: Receipt,
    minRole: 'admin',
  },
  {
    title: 'Data Customer',
    href: '/customers',
    icon: Contact,
    minRole: 'admin',
  },
  {
    title: 'Absensi Staff',
    href: '/absensi',
    icon: UserCheck,
    minRole: 'admin',
  },
  {
    title: 'Laporan & Keuangan',
    href: '/reports',
    icon: TrendingUp,
    minRole: 'spv',
  },
  {
    title: 'Master Data',
    href: '/master-data',
    icon: Database,
    minRole: 'spv',
  },
  {
    title: 'Pengaturan',
    href: '/settings',
    icon: Settings,
    minRole: 'spv',
  },
];

const AdminLayoutContext = React.createContext<boolean>(false);

export function useInAdminLayout() {
  return React.useContext(AdminLayoutContext);
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const isNested = React.useContext(AdminLayoutContext);

  if (isNested) {
    return <>{children}</>;
  }

  return <AdminLayoutMain>{children}</AdminLayoutMain>;
}

function AdminLayoutMain({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, hasAccess } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Auto expand menu if current route is within it
  useEffect(() => {
    // No-op: Sidebar is flat now
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0A2A5E] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Memuat Sistem Kasir Carwash Master...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const toggleSubmenu = (title: string) => {
    // No-op: Sidebar is flat now
  };

  // Filter menu based on search box & roles
  const filteredMenus = MENU_ITEMS
    .filter((menu) => !menu.minRole || hasAccess(menu.minRole))
    .filter((menu) => {
      if (searchQuery === '') return true;
      return menu.title.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    if (pathname === '/dashboard') return ['Home', 'Dashboard Owner'];
    if (pathname === '/transactions') return ['Home', 'Transaksi Kasir'];
    if (pathname === '/customers') return ['Home', 'Data Customer'];
    if (pathname.startsWith('/customers/')) return ['Home', 'Data Customer', 'Detail Customer & Riwayat Plat'];
    if (pathname === '/piutang') return ['Home', 'Daftar Piutang'];
    if (pathname === '/attendance' || pathname === '/absensi') return ['Home', 'Absensi Staff', 'Absensi Harian'];
    if (pathname === '/rekap-absensi') return ['Home', 'Absensi Staff', 'Rekap Bulanan'];
    if (pathname === '/reports') return ['Home', 'Laporan & Keuangan'];
    if (pathname === '/insentif-mingguan') return ['Home', 'Laporan & Keuangan', 'Insentif Mingguan'];
    if (pathname === '/komisi-washer') return ['Home', 'Laporan & Keuangan', 'Komisi Washer'];
    if (pathname === '/komisi-manual') return ['Home', 'Laporan & Keuangan', 'Komisi Manual'];
    if (pathname === '/laporan-bulanan') return ['Home', 'Laporan & Keuangan', 'Laporan Bulanan'];
    if (pathname === '/master-data') return ['Home', 'Master Data'];
    if (pathname === '/price-list') return ['Home', 'Master Data', 'Daftar Harga'];
    if (pathname === '/vehicles') return ['Home', 'Master Data', 'Kategori Kendaraan'];
    if (pathname === '/staff') return ['Home', 'Master Data', 'Data Staff'];
    if (pathname.includes('/multiplier')) return ['Home', 'Data Staff', 'Riwayat Komisi Multiplier'];
    if (pathname === '/staff-multipliers') return ['Home', 'Riwayat Komisi Multiplier'];
    if (pathname === '/users') return ['Home', 'Kelola User'];
    if (pathname === '/settings' || pathname === '/pengaturan') return ['Home', 'Pengaturan'];
    if (pathname === '/backup') return ['Home', 'Backup & PITR Storage'];
    return ['Home', 'Carwash Master'];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <AdminLayoutContext.Provider value={true}>
      <div className="flex min-h-screen bg-slate-100 font-sans text-slate-800 antialiased">
        {/* Mobile Drawer Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Fixed Left Sidebar (~260px) */}
        <aside
          className={`fixed top-0 bottom-0 left-0 z-50 flex w-[260px] flex-col bg-[#0A2A5E] text-white shadow-xl transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Header: Logo & App Title */}
          <div className="flex items-center justify-between border-b border-blue-900/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F97316] font-bold text-white shadow-md">
                BSA
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">Carwash Master</h1>
                <p className="text-xs text-blue-200">Sistem Kasir BSA</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-blue-200 hover:bg-blue-900/50 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="border-b border-blue-900/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-800 border-2 border-[#F97316] font-bold text-white text-base shadow-xs">
                {user.nama.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.nama}</p>
                <div className="mt-0.5 inline-flex items-center rounded-full bg-blue-900/80 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                  {user.role} ({user.username})
                </div>
              </div>
            </div>

            {/* Search Box below profile */}
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-blue-300" />
              <input
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md bg-blue-950/70 py-1.5 pl-8 pr-3 text-xs text-white placeholder-blue-300/70 border border-blue-800/80 focus:border-[#F97316] focus:outline-none"
              />
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {filteredMenus.map((menu) => {
              const isDirectActive =
                menu.href === pathname ||
                (menu.href === '/transactions' && pathname.startsWith('/transactions')) ||
                (menu.href === '/customers' && pathname.startsWith('/customers')) ||
                (menu.href === '/reports' && pathname.startsWith('/reports')) ||
                (menu.href === '/absensi' && pathname.startsWith('/absensi')) ||
                (menu.href === '/master-data' && pathname.startsWith('/master-data')) ||
                (menu.href === '/settings' && (pathname.startsWith('/settings') || pathname.startsWith('/pengaturan')));

              return (
                <Link
                  key={menu.title}
                  href={menu.href || '#'}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isDirectActive
                      ? 'bg-[#1E40AF] text-white shadow-xs font-semibold'
                      : 'text-blue-100 hover:bg-blue-900/50 hover:text-white'
                  }`}
                >
                  <menu.icon className={`h-4 w-4 ${isDirectActive ? 'text-[#F97316]' : 'text-blue-300'}`} />
                  <span>{menu.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Connection Status Banner */}
          <div className="border-t border-blue-900/60 p-3 text-xs bg-blue-950/40">
            <div className="flex items-center justify-between">
              <span className="text-blue-300 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-blue-400" />
                Database Mode:
              </span>
              {isSupabaseConfigured ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> Supabase
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-800">
                  Local Storage
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* Main Container Area */}
        <div className="flex flex-1 flex-col lg:pl-[260px]">
          {/* Topbar Navigation */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
            {/* Left: Hamburger & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
                title="Toggle Sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <nav className="flex items-center gap-2 text-sm text-slate-500">
                <Home className="h-4 w-4 text-slate-400" />
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-slate-300">/</span>
                    <span
                      className={
                        idx === breadcrumbs.length - 1
                          ? 'font-semibold text-[#0A2A5E]'
                          : 'text-slate-600'
                      }
                    >
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Right: Notifications & Logout */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  title="Notifikasi"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F97316]" />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg z-50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Notifikasi Sistem
                    </h4>
                    <div className="mt-3 space-y-2.5 text-xs text-slate-600">
                      <div className="rounded-lg bg-blue-50 p-2.5 text-blue-800 border border-blue-100">
                        <p className="font-semibold">Sistem Kasir BSA Aktif</p>
                        <p className="mt-0.5 text-[11px] text-blue-600">
                          Format nominal tanpa &quot;Rp&quot;, tanggal dd/mm/yyyy.
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800 border border-emerald-100">
                        <p className="font-semibold">Backup Terjadwal</p>
                        <p className="mt-0.5 text-[11px] text-emerald-600">
                          Point-in-Time Recovery & Weekly JSON/CSV Ready.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminLayoutContext.Provider>
  );
}
