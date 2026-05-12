import { db } from "@/db/client";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function promoteBootstrapAdmins() {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  for (const email of list) {
    await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
  }
}
