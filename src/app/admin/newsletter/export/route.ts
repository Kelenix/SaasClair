import { NextResponse } from "next/server";
import { logAdminAction, superAdminOrNull } from "@/features/admin/guard";

// Une cellule CSV ne doit jamais être interprétée comme une formule par un tableur.
const cell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Export CSV des abonnés actifs (réservé au super administrateur). */
export async function GET() {
  const admin = await superAdminOrNull();
  if (!admin) return new NextResponse("Accès refusé", { status: 403 });

  const { data, error } = await admin.supabase
    .from("newsletter_subscribers")
    .select("email, source, created_at")
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: false })
    .limit(50000);
  if (error) return new NextResponse("Export impossible", { status: 500 });

  const rows = [
    ["email", "source", "inscrit_le"],
    ...(data ?? []).map((row) => [row.email, row.source, row.created_at]),
  ];
  const csv = "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
  await logAdminAction(admin.supabase, "newsletter.export", null, { lignes: rows.length - 1 });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-saasclair.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
