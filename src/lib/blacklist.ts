import { db } from "@/db/client";
import { blacklist } from "@/db/schema";

let cache: { patterns: string[]; at: number } | null = null;
const TTL_MS = 30_000;

async function getPatterns(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.patterns;
  const rows = await db.select({ pattern: blacklist.pattern }).from(blacklist);
  cache = { patterns: rows.map((r) => r.pattern.toLowerCase()), at: Date.now() };
  return cache.patterns;
}

export function invalidateBlacklistCache() { cache = null; }

export async function isBlacklisted(url: string): Promise<boolean> {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return true; }

  const patterns = await getPatterns();
  for (const p of patterns) {
    if (p.startsWith("*.")) {
      const base = p.slice(2);
      if (host === base || host.endsWith("." + base)) return true;
    } else if (host === p) {
      return true;
    }
  }
  return false;
}
