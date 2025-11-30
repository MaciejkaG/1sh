/**
 * API route for handling link redirects with click tracking
 * Records analytics data before redirecting to the original URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getURL, getLinkData } from "@/lib/db";
import { recordClickEvent } from "@/lib/analytics";
import { AppError, ErrorCode, handleApiError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    
    // Get the original URL
    const originalUrl = await getURL(shortCode);
    
    if (!originalUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Link not found or has expired",
          code: ErrorCode.LINK_NOT_FOUND,
        },
        { status: 404 }
      );
    }
    
    // Get link data to extract linkId
    const linkData = await getLinkData(shortCode);
    
    if (!linkData) {
      return NextResponse.json(
        {
          success: false,
          error: "Link data not found",
          code: ErrorCode.LINK_NOT_FOUND,
        },
        { status: 404 }
      );
    }
    
    // Extract request information for analytics
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const referrer = request.headers.get("referer") || undefined;
    
    // Record click event asynchronously (don't wait for completion)
    recordClickEvent(linkData.id, ipAddress, userAgent, referrer).catch((error) => {
      console.error("Failed to record click event:", error);
      // Don't fail the redirect if analytics recording fails
    });
    
    // Redirect to the original URL
    return NextResponse.redirect(originalUrl, { status: 302 });
    
  } catch (error) {
    console.error("Redirect error:", error);
    
    if (error instanceof AppError) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}

/**
 * Extract client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback to localhost if no IP found
  return "127.0.0.1";
}