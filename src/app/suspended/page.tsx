"use client";

import Link from "next/link";
import { useApp } from "@/lib/i18n/provider";

export default function SuspendedPage() {
  const { t } = useApp();
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("suspended.title")}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {t("suspended.desc")}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t("suspended.back")}
        </Link>
      </div>
    </main>
  );
}
