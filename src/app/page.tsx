"use client";

import Link from "next/link";
import AppControls from "@/components/AppControls";
import { useApp } from "@/lib/i18n/provider";

const industries = ["Retail", "Kafe & Resto", "Salon & Jasa", "Toko Kelontong", "Butik", "Bengkel"];

export default function Home() {
  const { t } = useApp();

  const features = [
    { title: t("home.feature.pos.title"), desc: t("home.feature.pos.desc") },
    { title: t("home.feature.product.title"), desc: t("home.feature.product.desc") },
    { title: t("home.feature.receipt.title"), desc: t("home.feature.receipt.desc") },
    { title: t("home.feature.revenue.title"), desc: t("home.feature.revenue.desc") },
  ];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold text-brand-700 dark:text-brand-100">{t("app.name")}</span>
        <div className="flex items-center gap-3">
          <AppControls />
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t("nav.login")}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t("nav.signup")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-100">
          {t("home.badge")}
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
          {t("home.subtitle")}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            {t("home.cta.start")}
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("home.cta.haveAccount")}
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {industries.map((i) => (
            <span key={i} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {i}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {t("home.footer")}
      </footer>
    </main>
  );
}
