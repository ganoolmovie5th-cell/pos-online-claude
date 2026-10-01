import type { Locale } from "../dictionary";

// Each page/module contributes its own ID/EN strings. Add new modules here.
import { auth } from "./auth";
import { dashboard } from "./dashboard";
import { kasir } from "./kasir";
import { produk } from "./produk";
import { kategori } from "./kategori";
import { varian } from "./varian";
import { bundle } from "./bundle";
import { restock } from "./restock";
import { opname } from "./opname";
import { stokOutlet } from "./stok-outlet";
import { label } from "./label";
import { transaksi } from "./transaksi";
import { pelanggan } from "./pelanggan";
import { voucher } from "./voucher";
import { biaya } from "./biaya";
import { shift } from "./shift";
import { laporan } from "./laporan";
import { analitik } from "./analitik";
import { anggota } from "./anggota";
import { audit } from "./audit";
import { pengaturan } from "./pengaturan";
import { meja } from "./meja";
import { admin } from "./admin";
import { suspended } from "./suspended";

export type PageDict = Record<Locale, Record<string, string>>;

const modules: PageDict[] = [
  auth, dashboard, kasir, produk, kategori, varian, bundle, restock, opname,
  stokOutlet, label, transaksi, pelanggan, voucher, biaya, shift, laporan,
  analitik, anggota, audit, pengaturan, meja, admin, suspended,
];

export const pageStrings: PageDict = {
  id: Object.assign({}, ...modules.map((m) => m.id)),
  en: Object.assign({}, ...modules.map((m) => m.en)),
};
