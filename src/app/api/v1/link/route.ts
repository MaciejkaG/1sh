import { createLink } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { createLinkSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  let url;
  try {
    const res = await request.json();
    createLinkSchema.parse(res); // Validate body unsafely (fail throws an error)
  
    url = res.url;
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: "Incorrect request body format." }, { status: 400 });
  }

  let id;
  try {
    id = await createLink(url);
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: "Unknown server error occured while creating the link." }, { status: 500 })
  }

  return NextResponse.json({ success: true, id }, { status: 200 });
}