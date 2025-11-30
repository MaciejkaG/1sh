import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredLinks, deactivateExpiredLinks, getExpirationStats } from "@/lib/cleanup";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

const cleanupRequestSchema = z.object({
  mode: z.enum(['delete', 'deactivate', 'stats']).default('stats'),
  adminKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { mode, adminKey } = cleanupRequestSchema.parse(body);

    // Simple admin key check (in production, use proper authentication)
    const expectedAdminKey = process.env.ADMIN_KEY;
    if (expectedAdminKey && adminKey !== expectedAdminKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    let result;
    
    switch (mode) {
      case 'stats':
        result = await getExpirationStats();
        break;
        
      case 'deactivate':
        const deactivatedCount = await deactivateExpiredLinks();
        const statsAfterDeactivate = await getExpirationStats();
        result = {
          deactivatedCount,
          stats: statsAfterDeactivate,
        };
        break;
        
      case 'delete':
        const deletedCount = await cleanupExpiredLinks();
        const statsAfterDelete = await getExpirationStats();
        result = {
          deletedCount,
          stats: statsAfterDelete,
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        mode,
        timestamp: new Date().toISOString(),
        ...result,
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

export async function GET() {
  try {
    // GET endpoint for quick stats check (no admin key required)
    const stats = await getExpirationStats();
    
    return NextResponse.json({
      success: true,
      data: {
        mode: 'stats',
        timestamp: new Date().toISOString(),
        ...stats,
      },
    });

  } catch (error: unknown) {
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