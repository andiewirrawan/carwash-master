import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-white">
      <h2 className="text-3xl font-bold text-[#F97316]">404 - Halaman Tidak Ditemukan</h2>
      <p className="mt-2 text-sm text-slate-400">Halaman yang Anda cari tidak tersedia di sistem Carwash Master.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
