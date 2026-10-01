"use client";

import { useApp } from "@/lib/i18n/provider";

export default function AppControls({
  className = "",
}: {
  className?: string;
}) {
  const { locale, setLocale, theme, toggleTheme, t } = useApp();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Pilih bahasa */}
      <label className="sr-only" htmlFor="locale-select">
        {t("common.language")}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as "id" | "en")}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <option value="id">ID</option>
        <option value="en">EN</option>
      </select>

      {/* Toggle terang/gelap */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={theme === "dark"}
        title={theme === "dark" ? t("common.theme.light") : t("common.theme.dark")}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
        <span className="sr-only">
          {theme === "dark" ? t("common.theme.light") : t("common.theme.dark")}
        </span>
      </button>
    </div>
  );
}
