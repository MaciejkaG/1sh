import { z } from "zod";

// Enhanced create link schema with custom aliases and expiration dates
export const createLinkSchema = z.object({
  url: z
    .string()
    .url("The URL is incorrect.")
    .max(512, "The URL is too long (even for the shortener)."),
  customAlias: z
    .string()
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Custom alias can only contain letters, numbers, hyphens, and underscores"
    )
    .min(3, "Custom alias must be at least 3 characters long")
    .max(50, "Custom alias cannot exceed 50 characters")
    .optional(),
  expiresAt: z
    .string()
    .datetime("Invalid expiration date format")
    .refine(
      (str) => new Date(str) > new Date(),
      "Expiration date must be in the future"
    )
    .optional()
    .or(z.literal("")),
  turnstileToken: z.string().min(1, "Please complete the captcha"),
});

// Schema for click event recording
export const clickEventSchema = z.object({
  linkId: z.string().min(1, "Link ID is required"),
  ipAddress: z.string().ip("Invalid IP address format"),
  userAgent: z.string().min(1, "User agent is required"),
  referrer: z.string().url("Invalid referrer URL").optional(),
});

// Schema for analytics query parameters
export const analyticsQuerySchema = z.object({
  linkId: z.string().min(1, "Link ID is required"),
  managementToken: z.string().min(1, "Management token is required"),
  dateRange: z.enum(['7d', '30d', '90d']).default('30d'),
});

// Schema for bulk link management
export const bulkLinkQuerySchema = z.object({
  tokens: z.array(z.string().min(1)).min(1, "At least one token is required"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'clickCount', 'originalUrl']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for link deletion
export const deleteLinkSchema = z.object({
  linkId: z.string().min(1, "Link ID is required"),
  managementToken: z.string().min(1, "Management token is required"),
});

// Schema for custom alias availability check
export const aliasAvailabilitySchema = z.object({
  alias: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "Alias can only contain letters, numbers, hyphens, and underscores")
    .min(3, "Alias must be at least 3 characters long")
    .max(50, "Alias cannot exceed 50 characters"),
});

// Schema for device info validation
export const deviceInfoSchema = z.object({
  type: z.enum(['desktop', 'mobile', 'tablet']),
  browser: z.string().min(1),
  os: z.string().min(1),
});

// Schema for stored link data (Redis serialization)
export const storedLinkSchema = z.object({
  id: z.string(),
  originalUrl: z.string().url(),
  shortCode: z.string(),
  customAlias: z.string().optional(),
  managementToken: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean(),
});

// Schema for stored analytics data
export const storedAnalyticsSchema = z.object({
  linkId: z.string(),
  totalClicks: z.number().int().min(0),
  uniqueVisitors: z.number().int().min(0),
  lastUpdated: z.string().datetime(),
});

// Schema for stored click event data
export const storedClickEventSchema = z.object({
  id: z.string(),
  linkId: z.string(),
  timestamp: z.string().datetime(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  referrer: z.string().url().optional(),
  fingerprint: z.string(),
});

// Schema for processing create link data (with Date transformation)
export const processCreateLinkSchema = createLinkSchema.transform((data) => ({
  ...data,
  expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
}));

// Type inference for all schemas
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type ProcessedCreateLinkInput = z.infer<typeof processCreateLinkSchema>;
export type ClickEventInput = z.infer<typeof clickEventSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type BulkLinkQuery = z.infer<typeof bulkLinkQuerySchema>;
export type DeleteLinkInput = z.infer<typeof deleteLinkSchema>;
export type AliasAvailabilityInput = z.infer<typeof aliasAvailabilitySchema>;
export type DeviceInfoInput = z.infer<typeof deviceInfoSchema>;
export type StoredLinkInput = z.infer<typeof storedLinkSchema>;
export type StoredAnalyticsInput = z.infer<typeof storedAnalyticsSchema>;
export type StoredClickEventInput = z.infer<typeof storedClickEventSchema>;
