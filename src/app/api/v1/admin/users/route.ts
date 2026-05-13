import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { user } from "@/db/schema";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const users = await db
    .select()
    .from(user)
    .orderBy(user.createdAt)
    .limit(pageSize + 1)
    .offset(offset);

  const hasMore = users.length > pageSize;
  return NextResponse.json({ success: true, users: users.slice(0, pageSize), hasMore }, { status: 200 });
}
