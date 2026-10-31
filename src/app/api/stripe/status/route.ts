import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Avancement de l'import Stripe, interrogé par l'étape « Connecter Stripe » : état, et nombres
 * réellement importés (la RLS ne compte que les données du compte connecté).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ status: null }, { status: 401 });
  const supabase = await createClient();
  const count = async (table: "stripe_customers" | "stripe_subscriptions" | "stripe_invoices") =>
    (await supabase.from(table).select("*", { count: "exact", head: true })).count ?? 0;

  const [{ data: project }, customers, subscriptions, invoices] = await Promise.all([
    supabase
      .from("projects")
      .select("stripe_sync_status, stripe_livemode")
      .eq("owner_id", user.id)
      .maybeSingle(),
    count("stripe_customers"),
    count("stripe_subscriptions"),
    count("stripe_invoices"),
  ]);
  return NextResponse.json(
    {
      status: project?.stripe_sync_status ?? null,
      livemode: project?.stripe_livemode ?? null,
      customers,
      subscriptions,
      invoices,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
