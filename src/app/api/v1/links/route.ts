import { NextRequest, NextResponse } from "next/server";
import { getLinksByTokens, deleteLinkByToken, generateLinksCSV } from "@/lib/db";
import { validateManagementToken } from "@/lib/token";
import { handleApiError, AppError, ErrorCode } from "@/lib/errors";
import { LinkListResponse } from "@/lib/types";
import { z } from "zod";

// Schema for query parameters validation
const bulkLinkQuerySchema = z.object({
  tokens: z.string().min(1, "At least one token is required")
    .transform(str => str.split(',').filter(token => token.trim().length > 0)),
  page: z.string().optional().transform(str => str ? parseInt(str, 10) : 1)
    .refine(num => num >= 1, "Page must be at least 1"),
  limit: z.string().optional().transform(str => str ? parseInt(str, 10) : 20)
    .refine(num => num >= 1 && num <= 100, "Limit must be between 1 and 100"),
  sortBy: z.enum(['createdAt', 'clickCount', 'originalUrl']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  format: z.enum(['json', 'csv']).default('json'),
});

// Schema for bulk delete request
const bulkDeleteSchema = z.object({
  tokens: z.array(z.string().min(1)).min(1, "At least one token is required"),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      tokens: searchParams.get('tokens') || '',
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      format: searchParams.get('format') || 'json',
    };

    // Validate query parameters
    const validatedQuery = bulkLinkQuerySchema.parse(queryParams);
    const { tokens, page, limit, sortBy, sortOrder, format } = validatedQuery;

    // Validate all management tokens
    const validTokens: string[] = [];
    for (const token of tokens) {
      try {
        await validateManagementToken(token);
        validTokens.push(token);
      } catch {
        // Skip invalid tokens but continue processing valid ones
        console.warn('Invalid token skipped:', token);
      }
    }

    if (validTokens.length === 0) {
      throw new AppError(
        ErrorCode.INVALID_TOKEN,
        "No valid management tokens provided",
        401
      );
    }

    // Get links by tokens
    const links = await getLinksByTokens(validTokens);

    // Apply sorting
    links.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy) {
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'clickCount':
          aValue = a.clickCount;
          bValue = b.clickCount;
          break;
        case 'originalUrl':
          aValue = a.originalUrl;
          bValue = b.originalUrl;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'desc') {
        if (aValue > bValue) return -1;
        if (aValue < bValue) return 1;
        return 0;
      } else {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      }
    });

    // Calculate pagination
    const total = links.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLinks = links.slice(startIndex, endIndex);

    // Handle CSV export
    if (format === 'csv') {
      const csvContent = await generateLinksCSV(links); // Use all links for CSV, not paginated
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="links-export.csv"',
        },
      });
    }

    // Return JSON response with pagination
    const response: LinkListResponse = {
      success: true,
      data: {
        links: paginatedLinks,
        pagination: {
          total,
          page,
          limit,
        },
      },
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
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

export async function DELETE(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validatedData = bulkDeleteSchema.parse(body);
    const { tokens } = validatedData;

    // Validate all management tokens and collect results
    const deleteResults: Array<{ token: string; success: boolean; error?: string }> = [];
    
    for (const token of tokens) {
      try {
        // Validate token first
        await validateManagementToken(token);
        
        // Attempt to delete the link
        const deleted = await deleteLinkByToken(token);
        
        deleteResults.push({
          token,
          success: deleted,
          error: deleted ? undefined : 'Link not found or already deleted'
        });
      } catch (error) {
        deleteResults.push({
          token,
          success: false,
          error: error instanceof AppError ? error.message : 'Invalid token'
        });
      }
    }

    // Count successful deletions
    const successfulDeletions = deleteResults.filter(result => result.success).length;
    const failedDeletions = deleteResults.filter(result => !result.success);

    // Return detailed results
    return NextResponse.json({
      success: true,
      data: {
        totalRequested: tokens.length,
        successfulDeletions,
        failedDeletions: failedDeletions.length,
        results: deleteResults,
      },
    }, { status: 200 });

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