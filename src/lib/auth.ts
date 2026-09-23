import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

// Pastikan user login + punya business aktif. Dipakai di layout/page dashboard.
export async function requireBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, is_platform_admin, role, businesses(*)")
    .eq("id", user.id)
    .single();

  const business = (profile?.businesses ?? null) as unknown as Business | null;
  if (!business) redirect("/login");

  // Bisnis yang di-suspend admin tidak bisa dipakai
  if (business.is_suspended) redirect("/suspended");

  const isAdmin = Boolean(profile?.is_platform_admin);
  const role = (profile?.role as string) ?? "owner";

  return { supabase, user, business, isAdmin, role };
}

// Pastikan user adalah super-admin platform. Dipakai di route /admin.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) redirect("/dashboard");

  return { supabase, user };
}
