/**
 * Core TypeScript interfaces for the URL shortener application
 * Provides comprehensive type definitions for Link, ClickEvent, Analytics, and ManagementToken
 */

export interface Link {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias?: string;
  managementToken: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  clickCount: number;
  uniqueVisitors: number;
}

export interface ClickEvent {
  id: string;
  linkId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  device: DeviceInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

export interface Analytics {
  linkId: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: Record<string, number>;
  topReferrers: Array<{ referrer: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  geographicData: Array<{ country: string; count: number }>;
}

export interface ManagementToken {
  token: string;
  linkId: string;
  createdAt: Date;
  lastAccessed: Date;
}

// Storage interfaces for Redis serialization
export interface StoredLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias?: string;
  managementToken: string;
  createdAt: string; // ISO string
  expiresAt?: string; // ISO string
  isActive: boolean;
}

export interface StoredAnalytics {
  linkId: string;
  totalClicks: number;
  uniqueVisitors: number;
  lastUpdated: string; // ISO string
}

export interface StoredClickEvent {
  id: string;
  linkId: string;
  timestamp: string; // ISO string
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  fingerprint: string; // For unique visitor tracking
}

// API Response interfaces
export interface CreateLinkResponse {
  success: true;
  data: {
    id: string;
    shortUrl: string;
    managementToken: string;
    customAlias?: string;
  };
}

export interface AnalyticsResponse {
  success: true;
  data: Analytics;
}

export interface LinkListResponse {
  success: true;
  data: {
    links: Array<Link>;
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

// Union type for all API responses
export type ApiResponse<T = unknown> = 
  | { success: true; data: T }
  | ErrorResponse;