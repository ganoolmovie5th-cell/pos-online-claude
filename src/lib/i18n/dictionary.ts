import { pageStrings } from "./pages";

export type Locale = "id" | "en";

export const LOCALES: Locale[] = ["id", "en"];

const base = {
  id: {
    // nav / umum
    "app.name": "POS Online",
    "nav.login": "Masuk",
    "nav.signup": "Coba gratis",
    "nav.logout": "Keluar",
    "nav.menu": "Menu",
    "common.language": "Bahasa",
    "common.theme.light": "Terang",
    "common.theme.dark": "Gelap",

    // landing
    "home.badge": "Untuk semua jenis usaha",
    "home.title": "Aplikasi kasir online yang siap pakai",
    "home.subtitle":
      "Catat penjualan, kelola produk, dan pantau bisnis dari perangkat apa pun. Tanpa instal, langsung buka lewat browser.",
    "home.cta.start": "Mulai sekarang",
    "home.cta.haveAccount": "Sudah punya akun",
    "home.feature.pos.title": "Kasir cepat",
    "home.feature.pos.desc":
      "Pilih produk, hitung total, terima pembayaran dalam hitungan detik.",
    "home.feature.product.title": "Kelola produk",
    "home.feature.product.desc":
      "Katalog fleksibel dengan kategori dan stok opsional untuk industri apa pun.",
    "home.feature.receipt.title": "Riwayat & struk",
    "home.feature.receipt.desc":
      "Semua transaksi tercatat, struk siap cetak kapan saja.",
    "home.feature.revenue.title": "Pantau omzet",
    "home.feature.revenue.desc":
      "Dashboard ringkas: penjualan hari ini dan produk terlaris.",
    "home.footer": "POS Online — kasir untuk semua industri.",

    // sidebar
    "menu.dashboard": "Dashboard",
    "menu.kasir": "Kasir",
    "menu.meja": "Meja (F&B)",
    "menu.produk": "Produk",
    "menu.kategori": "Kategori",
    "menu.varian": "Varian",
    "menu.bundle": "Paket",
    "menu.restock": "Stok Masuk",
    "menu.opname": "Stok Opname",
    "menu.stokOutlet": "Stok Outlet",
    "menu.label": "Cetak Label",
    "menu.transaksi": "Transaksi",
    "menu.pelanggan": "Pelanggan",
    "menu.voucher": "Voucher",
    "menu.biaya": "Pengeluaran",
    "menu.shift": "Shift",
    "menu.laporan": "Laporan",
    "menu.analitik": "Analitik",
    "menu.anggota": "Anggota",
    "menu.audit": "Log Aktivitas",
    "menu.pengaturan": "Pengaturan",
  },
  en: {
    "app.name": "POS Online",
    "nav.login": "Sign in",
    "nav.signup": "Try free",
    "nav.logout": "Log out",
    "nav.menu": "Menu",
    "common.language": "Language",
    "common.theme.light": "Light",
    "common.theme.dark": "Dark",

    "home.badge": "For every kind of business",
    "home.title": "An online POS that is ready to use",
    "home.subtitle":
      "Record sales, manage products, and monitor your business from any device. No install, just open it in a browser.",
    "home.cta.start": "Get started",
    "home.cta.haveAccount": "I already have an account",
    "home.feature.pos.title": "Fast checkout",
    "home.feature.pos.desc":
      "Pick products, total up, and take payment in seconds.",
    "home.feature.product.title": "Manage products",
    "home.feature.product.desc":
      "A flexible catalog with categories and optional stock for any industry.",
    "home.feature.receipt.title": "History & receipts",
    "home.feature.receipt.desc":
      "Every transaction recorded, receipts ready to print any time.",
    "home.feature.revenue.title": "Track revenue",
    "home.feature.revenue.desc":
      "A compact dashboard: today's sales and best-selling products.",
    "home.footer": "POS Online — a cashier for every industry.",

    "menu.dashboard": "Dashboard",
    "menu.kasir": "Checkout",
    "menu.meja": "Tables (F&B)",
    "menu.produk": "Products",
    "menu.kategori": "Categories",
    "menu.varian": "Variants",
    "menu.bundle": "Bundles",
    "menu.restock": "Stock In",
    "menu.opname": "Stock Opname",
    "menu.stokOutlet": "Outlet Stock",
    "menu.label": "Print Labels",
    "menu.transaksi": "Transactions",
    "menu.pelanggan": "Customers",
    "menu.voucher": "Vouchers",
    "menu.biaya": "Expenses",
    "menu.shift": "Shift",
    "menu.laporan": "Reports",
    "menu.analitik": "Analytics",
    "menu.anggota": "Members",
    "menu.audit": "Activity Log",
    "menu.pengaturan": "Settings",
  },
};

// Merge per-page namespaces into the base dictionary. Each page module owns
// its own strings so they can be edited independently without conflicts.
export const dict: Record<Locale, Record<string, string>> = {
  id: { ...base.id, ...pageStrings.id },
  en: { ...base.en, ...pageStrings.en },
};

export type TranslationKey = string;
