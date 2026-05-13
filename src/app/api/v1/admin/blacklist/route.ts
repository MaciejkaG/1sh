import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { blacklist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { blacklistAddSchema } from "@/lib/schemas";
import { invalidateBlacklistCache } from "@/lib/blacklist";

export async function GET() {
  await requireAdmin();

  const patterns = await db.select().from(blacklist).orderBy(blacklist.createdAt);

  return NextResponse.json({ success: true, patterns }, { status: 200 });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  let body;
  try {
    const res = await request.json();
    body = blacklistAddSchema.parse(res);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    await db.insert(blacklist).values({
      pattern: body.pattern,
      reason: body.reason ?? null,
    });
    invalidateBlacklistCache();
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Pattern already exists." }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  await requireAdmin();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID is required." }, { status: 400 });
  }

  await db.delete(blacklist).where(eq(blacklist.id, parseInt(id)));

  invalidateBlacklistCache();

  return NextResponse.json({ success: true }, { status: 200 });
}
