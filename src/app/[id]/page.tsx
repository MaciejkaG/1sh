import { getURL, getLinkData } from "@/lib/db";
import { recordClickEvent } from "@/lib/analytics";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

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

  // Record click event for analytics (async, don't wait)
  try {
    const linkData = await getLinkData(id);
    if (linkData) {
      const headersList = await headers();
      const userAgent = headersList.get("user-agent") || "Unknown";
      const referrer = headersList.get("referer") || undefined;
      
      // Get IP from headers (simplified for server component)
      const forwardedFor = headersList.get("x-forwarded-for");
      const realIP = headersList.get("x-real-ip");
      const cfConnectingIP = headersList.get("cf-connecting-ip");
      
      const ipAddress = cfConnectingIP || 
                       (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ||
                       realIP || 
                       "127.0.0.1";
      
      // Record click event asynchronously
      recordClickEvent(linkData.id, ipAddress, userAgent, referrer).catch((error) => {
        console.error("Failed to record click event:", error);
        // Don't fail the redirect if analytics recording fails
      });
    }
  } catch (error) {
    console.error("Error recording click event:", error);
    // Continue with redirect even if analytics fails
  }

  redirect(url);
}