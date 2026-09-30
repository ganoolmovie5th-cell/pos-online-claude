// ============================================================
// KERANGKA — cetak struk ke printer thermal via WebUSB (ESC/POS).
//
// Butuh: printer thermal USB yang mendukung ESC/POS + browser Chromium
// (Chrome/Edge) dengan izin WebUSB. TIDAK BISA diuji tanpa printer fisik.
//
// WebUSB hanya jalan di HTTPS (atau localhost) dan butuh gesture user
// (panggil connectThermal() dari klik tombol).
//
// Banyak printer generik pakai interface class 7 (printer). Kalau printermu
// tampil sebagai vendor-specific, sesuaikan interfaceNumber/endpoint.
// Cek di chrome://device-log setelah mencolok printer.
// ============================================================

import { rupiah, tanggal } from "@/lib/format";
import type { Business, Sale, SaleItem } from "@/lib/types";

const ESC = 0x1b;
const GS = 0x1d;

// Bangun byte stream ESC/POS dari data struk.
export function buildEscposReceipt(
  business: Business | null,
  sale: Sale,
  items: SaleItem[]
): Uint8Array {
  const bytes: number[] = [];
  const enc = new TextEncoder();
  const text = (s: string) => bytes.push(...enc.encode(s));
  const line = (s = "") => text(s + "\n");
  const align = (n: 0 | 1 | 2) => bytes.push(ESC, 0x61, n); // 0 kiri,1 tengah,2 kanan
  const bold = (on: boolean) => bytes.push(ESC, 0x45, on ? 1 : 0);

  bytes.push(ESC, 0x40); // init

  align(1);
  bold(true);
  line(business?.name ?? "Struk");
  bold(false);
  if (business?.address) line(business.address);
  if (business?.phone) line(business.phone);
  line(tanggal(sale.created_at));
  if (sale.status === "voided") line("- DIBATALKAN -");
  align(0);
  line("--------------------------------");
  items.forEach((it) => {
    line(`${it.qty}x ${it.name}`);
    align(2);
    line(rupiah(it.line_total));
    align(0);
  });
  line("--------------------------------");
  line(`Subtotal : ${rupiah(sale.subtotal)}`);
  if (sale.discount > 0) line(`Diskon   : -${rupiah(sale.discount)}`);
  if (sale.tax > 0) line(`Pajak    : ${rupiah(sale.tax)}`);
  if (sale.service_charge > 0) line(`Service  : ${rupiah(sale.service_charge)}`);
  bold(true);
  line(`TOTAL    : ${rupiah(sale.total)}`);
  bold(false);
  if (sale.payment_method === "cash") {
    line(`Bayar    : ${rupiah(sale.paid)}`);
    line(`Kembali  : ${rupiah(sale.change)}`);
  }
  line();
  align(1);
  line(business?.receipt_footer || "Terima kasih");
  line();
  line();
  bytes.push(GS, 0x56, 0x00); // potong kertas (full cut)

  return new Uint8Array(bytes);
}

// Tipe WebUSB minimal (hindari dependency @types/w3c-web-usb).
type UsbEndpoint = { direction: string; endpointNumber: number };
type UsbInterface = { interfaceNumber: number; alternate: { endpoints: UsbEndpoint[] } };
type UsbDeviceLike = {
  configuration: { interfaces: UsbInterface[] } | null;
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: Uint8Array): Promise<unknown>;
};

type ThermalDevice = {
  device: UsbDeviceLike;
  interfaceNumber: number;
  endpoint: number;
};

// Minta user pilih printer + buka koneksi. Panggil dari klik tombol.
export async function connectThermal(): Promise<ThermalDevice> {
  const nav = navigator as Navigator & {
    usb?: { requestDevice: (o: unknown) => Promise<UsbDeviceLike> };
  };
  if (!nav.usb) throw new Error("Browser ini tidak mendukung WebUSB. Pakai Chrome/Edge.");

  const device = await nav.usb.requestDevice({ filters: [{ classCode: 7 }] });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);

  // Cari interface + endpoint OUT.
  const iface = device.configuration!.interfaces.find((i) =>
    i.alternate.endpoints.some((e) => e.direction === "out")
  );
  if (!iface) throw new Error("Endpoint OUT tidak ditemukan pada printer.");
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternate.endpoints.find((e) => e.direction === "out")!.endpointNumber;

  return { device, interfaceNumber: iface.interfaceNumber, endpoint };
}

export async function printThermal(conn: ThermalDevice, data: Uint8Array): Promise<void> {
  await conn.device.transferOut(conn.endpoint, data);
}
