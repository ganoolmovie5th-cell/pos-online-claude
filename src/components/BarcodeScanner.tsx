"use client";

import { useEffect, useRef } from "react";

// Scanner kamera pakai html5-qrcode. Dipakai di kasir sebagai overlay.
export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let stopped = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (stopped || !ref.current) return;
      const el = ref.current;
      el.id = el.id || "bc-reader";
      const inst = new Html5Qrcode(el.id);
      scanner = inst as unknown as { stop: () => Promise<void>; clear: () => void };
      try {
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded: string) => {
            onDetected(decoded);
          },
          () => {}
        );
      } catch {
        // kamera ditolak / tidak ada
      }
    })();

    return () => {
      stopped = true;
      if (scanner) {
        scanner.stop().then(() => scanner?.clear()).catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4">
      <div ref={ref} className="w-full max-w-sm overflow-hidden rounded-xl bg-black" />
      <button
        onClick={onClose}
        className="mt-4 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
      >
        Tutup
      </button>
    </div>
  );
}
