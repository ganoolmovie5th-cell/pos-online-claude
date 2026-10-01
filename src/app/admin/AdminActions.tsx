"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/i18n/provider";

export default function AdminActions({
  businessId,
  name,
  suspended,
}: {
  businessId: string;
  name: string;
  suspended: boolean;
}) {
  const { t } = useApp();
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
      alert(t("admin.error") + error.message);
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm(t("admin.confirmDelete").replace("{n}", name))) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("businesses").delete().eq("id", businessId);
    setBusy(false);
    if (error) {
      alert(t("admin.deleteError") + error.message);
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
        {suspended ? t("admin.action.activate") : t("admin.action.suspend")}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {t("admin.action.delete")}
      </button>
    </div>
  );
}
