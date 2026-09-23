// Antrean transaksi offline. Kalau checkout gagal (kemungkinan offline),
// simpan payload di localStorage lalu kirim ulang saat online.
// Catatan: ini bukan offline-first penuh. Stok/poin dihitung ulang saat sync,
// dan tidak ada resolusi konflik. Cukup agar transaksi tidak hilang saat internet putus.

const KEY = "pos_offline_queue";

export type QueuedSale = {
  sale: Record<string, unknown>;
  items: Record<string, unknown>[];
  decrement: { product_id: string; qty: number }[];
};

export function loadQueue(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueue(item: QueuedSale) {
  const q = loadQueue();
  q.push(item);
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function clearQueue() {
  localStorage.removeItem(KEY);
}

export function queueCount(): number {
  return loadQueue().length;
}
