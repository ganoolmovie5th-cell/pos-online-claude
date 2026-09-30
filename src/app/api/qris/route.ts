// ============================================================
// KERANGKA — QRIS dinamis via Midtrans Core API.
//
// Route ini membuat transaksi QRIS dan mengembalikan URL/paylod QR
// untuk ditampilkan di kasir. Perlu akun Midtrans + server key.
// TIDAK BISA diuji tanpa kredensial asli.
//
// Env yang dibutuhkan (tambahkan ke .env.local, JANGAN pakai NEXT_PUBLIC_):
//   MIDTRANS_SERVER_KEY=...        (dari dashboard Midtrans)
//   MIDTRANS_IS_PRODUCTION=false   (true saat live)
//
// Alternatif provider (Xendit, DOKU) mirip: POST ke endpoint charge
// dengan secret di header, ambil string QR dari response.
//
// Referensi resmi Midtrans QRIS:
//   https://docs.midtrans.com/docs/core-api-qris
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json(
      { error: "MIDTRANS_SERVER_KEY belum di-set. Lihat docs/PAYMENT_GATEWAY.md." },
      { status: 501 }
    );
  }

  const { amount, orderId } = (await req.json().catch(() => ({}))) as {
    amount?: number;
    orderId?: string;
  };
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount wajib > 0" }, { status: 400 });
  }

  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProd
    ? "https://api.midtrans.com/v2/charge"
    : "https://api.sandbox.midtrans.com/v2/charge";

  // Basic auth: base64(serverKey + ":")
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const res = await fetch(base, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: orderId ?? `pos-${Date.now()}`,
        gross_amount: Math.round(amount),
      },
      qris: { acquirer: "gopay" },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  // actions[] berisi URL gambar QR (generate-qr-code). Kirim ke kasir.
  const qr = (data.actions ?? []).find(
    (a: { name: string; url: string }) => a.name === "generate-qr-code"
  );
  return NextResponse.json({
    orderId: data.order_id,
    status: data.transaction_status,
    qrUrl: qr?.url ?? null,
    raw: data,
  });
}
