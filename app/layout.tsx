import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ClientErrorSafeguard } from '@/components/ClientErrorSafeguard';

export const metadata: Metadata = {
  title: 'Carwash Master - BSA Car Wash',
  description: 'Sistem Kasir & Operasional BSA Car Wash - Dashboard Owner, Transaksi Kasir, Data Customer & Nopol History, Absensi Harian & Rekap Bulanan, Insentif Mingguan (Komisi Cuci + Manual) & Export Excel',
  openGraph: {
    title: 'Carwash Master - BSA Car Wash',
    description: 'Sistem Kasir & Operasional BSA Car Wash - Dashboard Owner, Transaksi Kasir, Data Customer & Nopol History, Absensi Harian & Rekap Bulanan, Insentif Mingguan (Komisi Cuci + Manual) & Export Excel',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carwash Master - BSA Car Wash',
    description: 'Sistem Kasir & Operasional BSA Car Wash - Dashboard Owner, Transaksi Kasir, Data Customer & Nopol History, Absensi Harian & Rekap Bulanan, Insentif Mingguan (Komisi Cuci + Manual) & Export Excel',
  },
};


export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body suppressHydrationWarning className="bg-slate-100 font-sans antialiased">
        <ClientErrorSafeguard />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
