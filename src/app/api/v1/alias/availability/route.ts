import { NextRequest, NextResponse } from "next/server";
import { isAliasAvailable } from "@/lib/db";
import { aliasAvailabilitySchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { alias } = aliasAvailabilitySchema.parse(body);

    // Check if alias is available
    const available = await isAliasAvailable(alias);

    return NextResponse.json({
      success: true,
      data: {
        alias,
        available,
        message: available 
          ? `The alias "${alias}" is available` 
          : `The alias "${alias}" is already taken`
      },
    });

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