import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { user, session } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendAccountBannedEmail, sendAccountUnbannedEmail } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const { id } = await params;

  let body: { action: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const { action, reason } = body;

  const targets = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!targets.length) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }
  const target = targets[0];

  switch (action) {
    case "ban": {
      await db.update(user).set({ banned: true, banReason: reason ?? null }).where(eq(user.id, id));
      await db.delete(session).where(eq(session.userId, id));
      void sendAccountBannedEmail(target.email, reason);
      break;
    }
    case "unban": {
      await db.update(user).set({ banned: false, banReason: null }).where(eq(user.id, id));
      void sendAccountUnbannedEmail(target.email);
      break;
    }
    case "promote": {
      await db.update(user).set({ role: "admin" }).where(eq(user.id, id));
      break;
    }
    case "demote": {
      if (id === admin.user.id) {
        return NextResponse.json({ success: false, error: "Cannot demote yourself." }, { status: 400 });
      }
      await db.update(user).set({ role: "user" }).where(eq(user.id, id));
      break;
    }
    default:
      return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
