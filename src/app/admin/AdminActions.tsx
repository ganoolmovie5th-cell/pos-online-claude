"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminActions({
  businessId,
  name,
  suspended,
}: {
  businessId: string;
  name: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleSuspend() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ is_suspended: !suspended })
      .eq("id", businessId);
    setBusy(false);
    if (error) {
      alert("Gagal: " + error.message);
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        `Hapus bisnis "${name}" beserta semua produk & transaksinya? Tindakan ini permanen.`
      )
    )
      return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("businesses").delete().eq("id", businessId);
    setBusy(false);
    if (error) {
      alert("Gagal menghapus: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-3">
      <button
        onClick={toggleSuspend}
        disabled={busy}
        className="text-sm font-medium text-amber-600 hover:underline disabled:opacity-50"
      >
        {suspended ? "Aktifkan" : "Tangguhkan"}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        Hapus
      </button>
    </div>
  );
}
