import { getLinkInfo } from "@/lib/db";
import { recordClick } from "@/lib/analytics";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default async function LinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let info: Awaited<ReturnType<typeof getLinkInfo>>;
  try {
    info = await getLinkInfo(id);
  } catch {
    throw new Error("Failed to retrieve the long URL to redirect to.");
  }
  if (!info) notFound();

  if (info.blacklisted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full border rounded-xl p-8 space-y-6 text-center shadow-lg">
          <div className="flex justify-center">
            <div className="bg-red-100 dark:bg-red-950 rounded-full p-4">
              <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Link Blocked</h1>
            <p className="text-foreground font-medium">
              You clicked on a 1sh.pl short link, but it was maliciously created by a bad actor!
            </p>
            <p className="text-muted-foreground text-sm">
              1sh protected you this time, but watch out!
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Go to 1sh.pl
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-foreground">
              1sh.pl
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (info.disabled || info.expired) notFound();

  const h = await headers();
  try {
    await recordClick({
      linkId: id,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null,
      referer: h.get("referer"),
      userAgent: h.get("user-agent"),
    });
  } catch { /* swallow — never block redirect */ }

  redirect(info.url);
}
