import Link from "next/link";

const features = [
  { title: "Kasir cepat", desc: "Pilih produk, hitung total, terima pembayaran dalam hitungan detik." },
  { title: "Kelola produk", desc: "Katalog fleksibel dengan kategori dan stok opsional untuk industri apa pun." },
  { title: "Riwayat & struk", desc: "Semua transaksi tercatat, struk siap cetak kapan saja." },
  { title: "Pantau omzet", desc: "Dashboard ringkas: penjualan hari ini dan produk terlaris." },
];

const industries = ["Retail", "Kafe & Resto", "Salon & Jasa", "Toko Kelontong", "Butik", "Bengkel"];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold text-brand-700">POS Online</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Masuk
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Coba gratis
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Untuk semua jenis usaha
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Aplikasi kasir online yang siap pakai
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Catat penjualan, kelola produk, dan pantau bisnis dari perangkat apa pun. Tanpa instal,
          langsung buka lewat browser.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Mulai sekarang
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sudah punya akun
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {industries.map((i) => (
            <span key={i} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
              {i}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        POS Online — kasir untuk semua industri.
      </footer>
    </main>
  );
}
