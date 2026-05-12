import { getURL } from "@/lib/db";
import { recordClick } from "@/lib/analytics";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function Link({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let url: string | null;
  try {
    url = await getURL(id);
  } catch {
    throw new Error("Failed to retrieve the long URL to redirect to.");
  }
  if (!url) notFound();

  const h = await headers();
  // Fire-and-forget but await briefly so it lands before redirect throw.
  try {
    await recordClick({
      linkId: id,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null,
      referer: h.get("referer"),
      userAgent: h.get("user-agent"),
    });
  } catch { /* swallow — never block redirect */ }

  redirect(url);
}