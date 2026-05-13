import { createLink, SlugTakenError, InvalidSlugError } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { createLinkSchema } from "@/lib/schemas";
import { verifyTurnstile } from "@/lib/helpers";
import { isBlacklisted } from "@/lib/blacklist";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body;
  try {
    const res = await request.json();
    body = createLinkSchema.parse(res);
  } catch {
    return NextResponse.json({ success: false, error: "Incorrect request body format." }, { status: 400 });
  }

  const ok = await verifyTurnstile(body.turnstileToken);
  if (!ok) return NextResponse.json({ success: false, error: "Turnstile verification failed." }, { status: 422 });

  const session = await getSession();

  // Anonymous users cannot use custom slugs.
  const customSlug = body.customSlug && session ? body.customSlug : null;
  if (body.customSlug && !session) {
    return NextResponse.json({ success: false, error: "Sign in to use custom slugs." }, { status: 401 });
  }

  if (await isBlacklisted(body.url)) {
    return NextResponse.json({ success: false, error: "Destination is not allowed." }, { status: 422 });
  }

  try {
    const id = await createLink({ url: body.url, userId: session?.user.id ?? null, customSlug });
    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    if (err instanceof SlugTakenError) return NextResponse.json({ success: false, error: "That slug is taken." }, { status: 409 });
    if (err instanceof InvalidSlugError) return NextResponse.json({ success: false, error: "Invalid slug." }, { status: 422 });
    return NextResponse.json({ success: false, error: "Unknown server error." }, { status: 500 });
  }
}