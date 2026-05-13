import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { link, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendLinkDeletedEmail, sendLinkBlacklistedEmail } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  let body: { action: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const targets = await db
    .select({ id: link.id, userId: link.userId })
    .from(link)
    .where(eq(link.id, id))
    .limit(1);
  if (!targets.length) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }
  const target = targets[0];

  switch (body.action) {
    case "disable":
      await db.update(link).set({ disabled: true }).where(eq(link.id, id));
      break;
    case "enable":
      await db.update(link).set({ disabled: false }).where(eq(link.id, id));
      break;
    case "blacklist": {
      await db.update(link).set({ blacklisted: true }).where(eq(link.id, id));
      if (target.userId) {
        const owners = await db.select({ email: user.email }).from(user).where(eq(user.id, target.userId)).limit(1);
        if (owners[0]) void sendLinkBlacklistedEmail(owners[0].email, id);
      }
      break;
    }
    default:
      return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const targets = await db
    .select({ id: link.id, userId: link.userId })
    .from(link)
    .where(eq(link.id, id))
    .limit(1);
  if (!targets.length) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }
  const target = targets[0];

  await db.delete(link).where(eq(link.id, id));

  if (target.userId) {
    const owners = await db.select({ email: user.email }).from(user).where(eq(user.id, target.userId)).limit(1);
    if (owners[0]) void sendLinkDeletedEmail(owners[0].email, id);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
