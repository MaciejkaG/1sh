/**
 * Cleanup utilities for expired links and maintenance tasks
 */

import { createClient } from 'redis';
import { storedLinkSchema } from './schemas';

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

client.on("error", (err: unknown) => console.log("Redis Client Error", err));

// Initialize Redis connection
let isConnected = false;
async function ensureConnection() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

/**
 * Cleans up expired links from Redis storage
 * This function should be run periodically to maintain database hygiene
 * @returns Number of expired links that were cleaned up
 */
export async function cleanupExpiredLinks(): Promise<number> {
  await ensureConnection();
  
  const pattern = 'link:*';
  const keys = await client.keys(pattern);
  let cleanedCount = 0;
  
  const now = new Date();
  
  for (const key of keys) {
    try {
      const linkData = await client.get(key);
      if (!linkData) continue;
      
      const parsed = JSON.parse(linkData);
      const link = storedLinkSchema.parse(parsed);
      
      // Check if link has expired
      if (link.expiresAt) {
        const expirationDate = new Date(link.expiresAt);
        if (expirationDate <= now) {
          // Link has expired, remove it
          await client.del(key);
          
          // Also remove custom alias mapping if it exists
          if (link.customAlias) {
            await client.del(`alias:${link.customAlias}`);
          }
          
          cleanedCount++;
          console.log(`Cleaned up expired link: ${link.shortCode}`);
        }
      }
    } catch (error) {
      // If we can't parse the link data, it's corrupted - remove it
      console.error(`Removing corrupted link data for key: ${key}`, error);
      await client.del(key);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

/**
 * Deactivates expired links without removing them from storage
 * This is a softer approach that preserves data for analytics
 * @returns Number of links that were deactivated
 */
export async function deactivateExpiredLinks(): Promise<number> {
  await ensureConnection();
  
  const pattern = 'link:*';
  const keys = await client.keys(pattern);
  let deactivatedCount = 0;
  
  const now = new Date();
  
  for (const key of keys) {
    try {
      const linkData = await client.get(key);
      if (!linkData) continue;
      
      const parsed = JSON.parse(linkData);
      const link = storedLinkSchema.parse(parsed);
      
      // Check if link has expired and is still active
      if (link.expiresAt && link.isActive) {
        const expirationDate = new Date(link.expiresAt);
        if (expirationDate <= now) {
          // Link has expired, deactivate it
          const updatedLink = {
            ...link,
            isActive: false,
          };
          
          await client.set(key, JSON.stringify(updatedLink));
          deactivatedCount++;
          console.log(`Deactivated expired link: ${link.shortCode}`);
        }
      }
    } catch (error) {
      console.error(`Error processing link for key: ${key}`, error);
    }
  }
  
  return deactivatedCount;
}

/**
 * Gets statistics about expired links in the system
 * @returns Object containing counts of expired, active, and total links
 */
export async function getExpirationStats(): Promise<{
  totalLinks: number;
  activeLinks: number;
  expiredLinks: number;
  expiredButActive: number;
}> {
  await ensureConnection();
  
  const pattern = 'link:*';
  const keys = await client.keys(pattern);
  
  let totalLinks = 0;
  let activeLinks = 0;
  let expiredLinks = 0;
  let expiredButActive = 0;
  
  const now = new Date();
  
  for (const key of keys) {
    try {
      const linkData = await client.get(key);
      if (!linkData) continue;
      
      const parsed = JSON.parse(linkData);
      const link = storedLinkSchema.parse(parsed);
      
      totalLinks++;
      
      if (link.isActive) {
        activeLinks++;
      }
      
      if (link.expiresAt) {
        const expirationDate = new Date(link.expiresAt);
        if (expirationDate <= now) {
          expiredLinks++;
          if (link.isActive) {
            expiredButActive++;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing link for key: ${key}`, error);
    }
  }
  
  return {
    totalLinks,
    activeLinks,
    expiredLinks,
    expiredButActive,
  };
}

/**
 * Schedules automatic cleanup of expired links
 * This function can be called periodically (e.g., via cron job or scheduled task)
 * @param cleanupMode - 'delete' to remove expired links, 'deactivate' to just mark as inactive
 */
export async function scheduleCleanup(cleanupMode: 'delete' | 'deactivate' = 'deactivate'): Promise<void> {
  console.log(`Starting scheduled cleanup in ${cleanupMode} mode...`);
  
  try {
    const stats = await getExpirationStats();
    console.log('Pre-cleanup stats:', stats);
    
    let processedCount: number;
    if (cleanupMode === 'delete') {
      processedCount = await cleanupExpiredLinks();
    } else {
      processedCount = await deactivateExpiredLinks();
    }
    
    const newStats = await getExpirationStats();
    console.log('Post-cleanup stats:', newStats);
    console.log(`Cleanup completed. Processed ${processedCount} expired links.`);
    
  } catch (error) {
    console.error('Error during scheduled cleanup:', error);
    throw error;
  }
}

// Export the Redis client for use in other modules
export { client as cleanupRedisClient };