import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

// Pastikan user login + punya business. Dipakai di layout/page dashboard.
export async function requireBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(*)")
    .eq("id", user.id)
    .single();

  const business = (profile?.businesses ?? null) as unknown as Business | null;
  if (!business) redirect("/login");

  return { supabase, user, business };
}
