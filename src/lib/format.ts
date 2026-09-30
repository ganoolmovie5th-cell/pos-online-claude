export function rupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function tanggal(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Bulatkan ke kelipatan terdekat (mis. 100, 500). step<=0 = tanpa pembulatan.
export function roundTo(n: number, step: number): number {
  if (!step || step <= 0) return n;
  return Math.round(n / step) * step;
}
