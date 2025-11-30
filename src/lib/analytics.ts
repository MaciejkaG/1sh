/**
 * Analytics and click tracking utilities for the URL shortener application
 * Provides comprehensive click event recording and analytics aggregation
 */

import { nanoid } from "nanoid";
import { createClient } from "redis";
import { ClickEvent, StoredClickEvent, DeviceInfo, Analytics } from "./types";
import { storedClickEventSchema } from "./schemas";
import { anonymizeIpAddress, generateFingerprint } from "./validation";
import { AppError, ErrorCode } from "./errors";

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

client.on("error", (err: unknown) => console.log("Redis Analytics Client Error", err));

// Ensure client is connected
if (!client.isOpen) {
  await client.connect();
}

/**
 * Parse user agent string to extract device information
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();
  
  // Device type detection
  let type: DeviceInfo['type'] = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    type = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    type = 'tablet';
  }
  
  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }
  
  // OS detection
  let os = 'Unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  }
  
  return { type, browser, os };
}

/**
 * Record a click event for analytics tracking
 */
export async function recordClickEvent(
  linkId: string,
  ipAddress: string,
  userAgent: string,
  referrer?: string
): Promise<void> {
  try {
    // Generate unique click event ID
    const clickId = nanoid(16);
    const timestamp = new Date();
    const fingerprint = generateFingerprint(ipAddress, userAgent);
    const device = parseUserAgent(userAgent);
    
    // Create click event data
    const clickEvent: ClickEvent = {
      id: clickId,
      linkId,
      timestamp,
      ipAddress: anonymizeIpAddress(ipAddress),
      userAgent,
      referrer,
      device,
    };
    
    // Create stored version for Redis
    const storedClickEvent: StoredClickEvent = {
      id: clickId,
      linkId,
      timestamp: timestamp.toISOString(),
      ipAddress: anonymizeIpAddress(ipAddress),
      userAgent,
      referrer,
      fingerprint,
    };
    
    // Store click event with time-based key for efficient querying
    const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
    const clickKey = `clicks:${linkId}:${dateKey}`;
    
    // Add click event to daily list
    await client.lPush(clickKey, JSON.stringify(storedClickEvent));
    
    // Set expiration for click data (90 days)
    const expirationSeconds = 90 * 24 * 60 * 60; // 90 days
    await client.expire(clickKey, expirationSeconds);
    
    // Update link analytics counters
    await updateLinkAnalytics(linkId, fingerprint);
    
  } catch (error) {
    console.error('Error recording click event:', error);
    throw new AppError(
      ErrorCode.ANALYTICS_ERROR,
      'Failed to record click event',
      500
    );
  }
}

/**
 * Update link analytics counters (total clicks and unique visitors)
 */
async function updateLinkAnalytics(linkId: string, fingerprint: string): Promise<void> {
  const analyticsKey = `analytics:${linkId}`;
  const uniqueVisitorsKey = `unique:${linkId}`;
  
  // Increment total clicks
  await client.hIncrBy(analyticsKey, 'totalClicks', 1);
  
  // Check if this is a unique visitor (within 24 hours)
  const isUniqueVisitor = await client.setNX(`visitor:${linkId}:${fingerprint}`, '1');
  
  if (isUniqueVisitor) {
    // Set expiration for unique visitor tracking (24 hours)
    await client.expire(`visitor:${linkId}:${fingerprint}`, 24 * 60 * 60);
    
    // Increment unique visitors count
    await client.hIncrBy(analyticsKey, 'uniqueVisitors', 1);
    
    // Add to unique visitors set for more detailed tracking
    await client.sAdd(uniqueVisitorsKey, fingerprint);
    
    // Set expiration for unique visitors set (90 days)
    await client.expire(uniqueVisitorsKey, 90 * 24 * 60 * 60);
  }
  
  // Update last updated timestamp
  await client.hSet(analyticsKey, 'lastUpdated', new Date().toISOString());
  
  // Set expiration for analytics data (1 year)
  await client.expire(analyticsKey, 365 * 24 * 60 * 60);
}

/**
 * Get click events for a specific link within a date range
 */
export async function getClickEvents(
  linkId: string,
  startDate: Date,
  endDate: Date
): Promise<ClickEvent[]> {
  try {
    const clickEvents: ClickEvent[] = [];
    const currentDate = new Date(startDate);
    
    // Iterate through each day in the date range
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const clickKey = `clicks:${linkId}:${dateKey}`;
      
      // Get all click events for this day
      const dailyClicks = await client.lRange(clickKey, 0, -1);
      
      for (const clickData of dailyClicks) {
        try {
          const parsed = JSON.parse(clickData);
          const storedEvent = storedClickEventSchema.parse(parsed);
          
          // Convert stored event to ClickEvent interface
          const clickEvent: ClickEvent = {
            id: storedEvent.id,
            linkId: storedEvent.linkId,
            timestamp: new Date(storedEvent.timestamp),
            ipAddress: storedEvent.ipAddress,
            userAgent: storedEvent.userAgent,
            referrer: storedEvent.referrer,
            device: parseUserAgent(storedEvent.userAgent),
          };
          
          clickEvents.push(clickEvent);
        } catch (parseError) {
          console.error('Error parsing click event:', parseError);
          // Continue processing other events
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sort by timestamp (most recent first)
    return clickEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
  } catch (error) {
    console.error('Error retrieving click events:', error);
    throw new AppError(
      ErrorCode.ANALYTICS_ERROR,
      'Failed to retrieve click events',
      500
    );
  }
}

/**
 * Get basic analytics data for a link
 */
export async function getLinkAnalytics(linkId: string): Promise<{ totalClicks: number; uniqueVisitors: number; lastUpdated?: Date }> {
  try {
    const analyticsKey = `analytics:${linkId}`;
    const analyticsData = await client.hGetAll(analyticsKey);
    
    return {
      totalClicks: parseInt(analyticsData.totalClicks || '0', 10),
      uniqueVisitors: parseInt(analyticsData.uniqueVisitors || '0', 10),
      lastUpdated: analyticsData.lastUpdated ? new Date(analyticsData.lastUpdated) : undefined,
    };
  } catch (error) {
    console.error('Error retrieving link analytics:', error);
    return {
      totalClicks: 0,
      uniqueVisitors: 0,
    };
  }
}

/**
 * Check if Redis client is connected
 */
export function isAnalyticsConnected(): boolean {
  return client.isOpen;
}

/**
 * Calculate comprehensive analytics for a link within a date range
 */
export async function calculateLinkAnalytics(
  linkId: string,
  dateRange: '7d' | '30d' | '90d' = '30d'
): Promise<Analytics> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    // Get all click events for the date range
    const clickEvents = await getClickEvents(linkId, startDate, endDate);
    
    // Calculate basic metrics
    const totalClicks = clickEvents.length;
    const uniqueVisitors = new Set(
      clickEvents.map(event => generateFingerprint(event.ipAddress, event.userAgent))
    ).size;
    
    // Calculate clicks by day
    const clicksByDay: Record<string, number> = {};
    const currentDate = new Date(startDate);
    
    // Initialize all days with 0 clicks
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      clicksByDay[dateKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Count actual clicks by day
    clickEvents.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      clicksByDay[dateKey] = (clicksByDay[dateKey] || 0) + 1;
    });
    
    // Calculate top referrers
    const referrerCounts: Record<string, number> = {};
    clickEvents.forEach(event => {
      if (event.referrer) {
        try {
          const referrerDomain = new URL(event.referrer).hostname;
          referrerCounts[referrerDomain] = (referrerCounts[referrerDomain] || 0) + 1;
        } catch {
          // Invalid referrer URL, count as "Direct"
          referrerCounts['Direct'] = (referrerCounts['Direct'] || 0) + 1;
        }
      } else {
        referrerCounts['Direct'] = (referrerCounts['Direct'] || 0) + 1;
      }
    });
    
    const topReferrers = Object.entries(referrerCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 referrers
    
    // Calculate device breakdown
    const deviceBreakdown: Record<string, number> = {};
    clickEvents.forEach(event => {
      const deviceKey = `${event.device.type} - ${event.device.browser}`;
      deviceBreakdown[deviceKey] = (deviceBreakdown[deviceKey] || 0) + 1;
    });
    
    // Calculate geographic data (simplified - using country from IP if available)
    const geographicData: Array<{ country: string; count: number }> = [];
    const countryCounts: Record<string, number> = {};
    
    clickEvents.forEach(event => {
      // For now, we'll use a placeholder since we don't have IP geolocation
      // In a real implementation, you'd use a service like MaxMind GeoIP
      const country = event.country || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    
    Object.entries(countryCounts).forEach(([country, count]) => {
      geographicData.push({ country, count });
    });
    
    geographicData.sort((a, b) => b.count - a.count);
    
    return {
      linkId,
      totalClicks,
      uniqueVisitors,
      clicksByDay,
      topReferrers,
      deviceBreakdown,
      geographicData,
    };
    
  } catch (error) {
    console.error('Error calculating link analytics:', error);
    throw new AppError(
      ErrorCode.ANALYTICS_ERROR,
      'Failed to calculate analytics',
      500
    );
  }
}

/**
 * Get analytics summary for multiple links (for dashboard)
 */
export async function getMultipleLinkAnalytics(
  linkIds: string[]
): Promise<Array<{ linkId: string; totalClicks: number; uniqueVisitors: number }>> {
  try {
    const results = await Promise.all(
      linkIds.map(async (linkId) => {
        const analytics = await getLinkAnalytics(linkId);
        return {
          linkId,
          totalClicks: analytics.totalClicks,
          uniqueVisitors: analytics.uniqueVisitors,
        };
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error retrieving multiple link analytics:', error);
    throw new AppError(
      ErrorCode.ANALYTICS_ERROR,
      'Failed to retrieve analytics for multiple links',
      500
    );
  }
}

/**
 * Get real-time analytics (cached for performance)
 */
export async function getRealTimeAnalytics(linkId: string): Promise<{
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  uniqueVisitorsToday: number;
}> {
  try {
    // Get basic analytics
    const basicAnalytics = await getLinkAnalytics(linkId);
    
    // Get today's analytics
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEvents = await getClickEvents(linkId, startOfDay, today);
    
    const clicksToday = todayEvents.length;
    const uniqueVisitorsToday = new Set(
      todayEvents.map(event => generateFingerprint(event.ipAddress, event.userAgent))
    ).size;
    
    return {
      totalClicks: basicAnalytics.totalClicks,
      uniqueVisitors: basicAnalytics.uniqueVisitors,
      clicksToday,
      uniqueVisitorsToday,
    };
  } catch (error) {
    console.error('Error retrieving real-time analytics:', error);
    throw new AppError(
      ErrorCode.ANALYTICS_ERROR,
      'Failed to retrieve real-time analytics',
      500
    );
  }
}

/**
 * Aggregate analytics data for performance optimization
 * This function can be run periodically to pre-calculate analytics
 */
export async function aggregateAnalyticsData(linkId: string): Promise<void> {
  try {
    // Calculate analytics for different time periods
    const analytics7d = await calculateLinkAnalytics(linkId, '7d');
    const analytics30d = await calculateLinkAnalytics(linkId, '30d');
    const analytics90d = await calculateLinkAnalytics(linkId, '90d');
    
    // Store aggregated data with expiration
    const aggregatedKey = `aggregated:${linkId}`;
    const aggregatedData = {
      '7d': analytics7d,
      '30d': analytics30d,
      '90d': analytics90d,
      lastAggregated: new Date().toISOString(),
    };
    
    await client.set(aggregatedKey, JSON.stringify(aggregatedData));
    await client.expire(aggregatedKey, 60 * 60); // Cache for 1 hour
    
  } catch (error) {
    console.error('Error aggregating analytics data:', error);
    // Don't throw error for background aggregation
  }
}

/**
 * Get cached aggregated analytics if available, otherwise calculate fresh
 */
export async function getCachedAnalytics(
  linkId: string,
  dateRange: '7d' | '30d' | '90d' = '30d'
): Promise<Analytics> {
  try {
    const aggregatedKey = `aggregated:${linkId}`;
    const cachedData = await client.get(aggregatedKey);
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const lastAggregated = new Date(parsed.lastAggregated);
      const now = new Date();
      
      // Use cached data if it's less than 5 minutes old
      if (now.getTime() - lastAggregated.getTime() < 5 * 60 * 1000) {
        return parsed[dateRange];
      }
    }
    
    // Calculate fresh analytics
    return await calculateLinkAnalytics(linkId, dateRange);
    
  } catch (error) {
    console.error('Error retrieving cached analytics:', error);
    // Fallback to fresh calculation
    return await calculateLinkAnalytics(linkId, dateRange);
  }
}

/**
 * Close analytics Redis connection
 */
export async function closeAnalyticsConnection(): Promise<void> {
  if (client.isOpen) {
    await client.quit();
  }
}