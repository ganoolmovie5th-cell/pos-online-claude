import Link from "next/link";

export default function SuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">Akun ditangguhkan</h1>
        <p className="mt-3 text-slate-600">
          Bisnis kamu sedang ditangguhkan oleh admin platform. Hubungi dukungan untuk
          informasi lebih lanjut.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Kembali ke masuk
        </Link>
      </div>
    </main>
  );
}
