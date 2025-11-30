import { NextRequest, NextResponse } from "next/server";
import { validateManagementToken } from "@/lib/token";
import { getCachedAnalytics } from "@/lib/analytics";
import { handleApiError, AppError, ErrorCode } from "@/lib/errors";
import { AnalyticsResponse } from "@/lib/types";
import { z } from "zod";

// Schema for query parameters validation
const analyticsQuerySchema = z.object({
  token: z.string().min(1, "Management token is required"),
  dateRange: z.enum(['7d', '30d', '90d']).default('30d'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    
    if (!linkId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Link ID is required",
        400
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      token: searchParams.get('token') || '',
      dateRange: searchParams.get('dateRange') || '30d',
    };

    // Validate query parameters
    const validatedQuery = analyticsQuerySchema.parse(queryParams);
    const { token, dateRange } = validatedQuery;

    // Validate management token and get associated link ID
    const tokenLinkId = await validateManagementToken(token);
    
    // Ensure the token is associated with the requested link
    if (tokenLinkId !== linkId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        "You don't have permission to access analytics for this link",
        403
      );
    }

    // Get analytics data with caching for performance
    const analytics = await getCachedAnalytics(linkId, dateRange);

    // Return structured analytics response
    const response: AnalyticsResponse = {
      success: true,
      data: analytics,
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
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