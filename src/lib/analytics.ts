import { createHash } from "crypto";
import { db } from "@/db/client";
import { linkEvent } from "@/db/schema";

function dailySalt() {
  const day = new Date().toISOString().slice(0, 10);
  return `${process.env.BETTER_AUTH_SECRET ?? "salt"}:${day}`;
}

export async function recordClick(opts: {
  linkId: string;
  ip?: string | null;
  country?: string | null;
  referer?: string | null;
  userAgent?: string | null;
}) {
  const ipHash = opts.ip
    ? createHash("sha256").update(opts.ip + dailySalt()).digest("hex")
    : null;
  await db.insert(linkEvent).values({
    linkId: opts.linkId,
    country: opts.country ?? null,
    referer: opts.referer ?? null,
    userAgent: opts.userAgent ?? null,
    ipHash,
  });
}
