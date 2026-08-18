import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      {/* 404 number */}
      <div className="relative">
        <span className="font-display text-[10rem] font-bold leading-none text-navy-900/5">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gold-gradient font-display text-6xl font-bold">
            404
          </span>
        </div>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-3 max-w-md text-sm text-navy-900/60">
        Sepertinya halaman yang kamu cari sudah dipindahkan atau tidak tersedia.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 transition-all hover:bg-gold-400 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
      >
        ← Kembali ke Beranda
      </Link>
    </div>
  );
}