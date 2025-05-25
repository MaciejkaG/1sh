import { getURL } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export default async function Link({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let url;
  try {
    url = await getURL(id);
  } catch (err) {
    throw new Error("Failed to retrieve the long URL to redirect to.");
  }

  if (!url) {
    notFound();
  }

  redirect(url);
}