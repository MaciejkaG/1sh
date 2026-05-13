import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent, user } from "@/db/schema";
import { eq, count as drizzleCount, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LinkDetailActions } from "./LinkDetailActions";

export default async function AdminLinkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const rows = await db
    .select({
      id: link.id,
      url: link.url,
      userId: link.userId,
      custom: link.custom,
      disabled: link.disabled,
      blacklisted: link.blacklisted,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(link)
    .leftJoin(user, eq(link.userId, user.id))
    .where(eq(link.id, slug))
    .limit(1);

  if (!rows.length) notFound();
  const l = rows[0];

  const [clickCountRow, recentEvents, countryRows] = await Promise.all([
    db.select({ count: drizzleCount(linkEvent.id) }).from(linkEvent).where(eq(linkEvent.linkId, slug)),
    db
      .select({ at: linkEvent.at, country: linkEvent.country, referer: linkEvent.referer, userAgent: linkEvent.userAgent })
      .from(linkEvent)
      .where(eq(linkEvent.linkId, slug))
      .orderBy(desc(linkEvent.at))
      .limit(10),
    db
      .select({ country: linkEvent.country, count: drizzleCount(linkEvent.id) })
      .from(linkEvent)
      .where(eq(linkEvent.linkId, slug))
      .groupBy(linkEvent.country)
      .orderBy(desc(drizzleCount(linkEvent.id)))
      .limit(5),
  ]);

  const totalClicks = clickCountRow[0]?.count ?? 0;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono">{slug}</h1>
        <p className="text-muted-foreground text-sm">Link detail</p>
      </div>

      <div className="border rounded-lg divide-y">
        <Row label="Destination URL">
          <span className="font-mono text-xs break-all">{l.url}</span>
        </Row>
        <Row label="Owner">
          {l.ownerEmail ? (
            <span>
              {l.ownerName} <span className="text-muted-foreground text-xs">({l.ownerEmail})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Anonymous</span>
          )}
        </Row>
        {l.userId && (
          <Row label="Owner ID">
            <span className="font-mono text-xs">{l.userId}</span>
          </Row>
        )}
        <Row label="Created">
          {new Date(l.createdAt).toLocaleString()}
        </Row>
        {l.expiresAt && (
          <Row label="Expires">
            {new Date(l.expiresAt).toLocaleString()}
          </Row>
        )}
        <Row label="Custom slug">{l.custom ? "Yes" : "No"}</Row>
        <Row label="Total clicks">{totalClicks}</Row>
        <Row label="Status">
          <div className="flex gap-2">
            {l.disabled && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Disabled</span>
            )}
            {l.blacklisted && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Blacklisted</span>
            )}
            {!l.disabled && !l.blacklisted && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
            )}
          </div>
        </Row>
      </div>

      <LinkDetailActions slug={slug} disabled={l.disabled} blacklisted={l.blacklisted} />

      {countryRows.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Top countries</h2>
          <div className="space-y-1">
            {countryRows.map((c) => (
              <div key={c.country ?? "unknown"} className="flex justify-between text-sm">
                <span>{c.country ?? "Unknown"}</span>
                <span className="font-mono">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentEvents.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Recent clicks</h2>
          <div className="space-y-2">
            {recentEvents.map((e, i) => (
              <div key={i} className="text-xs border rounded p-2 space-y-0.5">
                <div className="text-muted-foreground">{new Date(e.at).toLocaleString()}</div>
                {e.country && <div>Country: {e.country}</div>}
                {e.referer && (
                  <div className="truncate text-muted-foreground">Referer: {e.referer}</div>
                )}
                {e.userAgent && (
                  <div className="truncate text-muted-foreground">UA: {e.userAgent.slice(0, 80)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <div className="w-36 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}
