import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ClientErrorSafeguard } from '@/components/ClientErrorSafeguard';

export const metadata: Metadata = {
  title: 'Carwash Master - BSA Car Wash',
  description: 'Sistem Kasir BSA Car Wash - Kelola Master Data, Staff, Komisi Multiplier, & User',
  openGraph: {
    title: 'Carwash Master - BSA Car Wash',
    description: 'Sistem Kasir BSA Car Wash - Kelola Master Data, Staff, Komisi Multiplier, & User',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carwash Master - BSA Car Wash',
    description: 'Sistem Kasir BSA Car Wash - Kelola Master Data, Staff, Komisi Multiplier, & User',
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
