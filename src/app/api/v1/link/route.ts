import { createLink } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { processCreateLinkSchema } from "@/lib/schemas";
import { verifyTurnstile } from "@/lib/helpers";
import { handleApiError, AppError, ErrorCode } from "@/lib/errors";
import { CreateLinkResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = processCreateLinkSchema.parse(body);
    
    const { url, customAlias, expiresAt, turnstileToken } = validatedData;

    // Verify Turnstile token
    const isVerified = await verifyTurnstile(turnstileToken);
    if (!isVerified) {
      throw new AppError(
        ErrorCode.TURNSTILE_VERIFICATION_FAILED,
        "Captcha verification failed. Please try again.",
        422
      );
    }

    // Create the link with enhanced options
    const result = await createLink({
      url,
      customAlias,
      expiresAt,
    });

    // Construct the full short URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const shortUrl = `${baseUrl}/${result.shortCode}`;

    // Return success response with management token
    const response: CreateLinkResponse = {
      success: true,
      data: {
        id: result.id,
        shortUrl,
        managementToken: result.managementToken,
        customAlias: result.customAlias,
      },
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: unknown) {
    // Handle errors using centralized error handler
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode }
    );
  }
}