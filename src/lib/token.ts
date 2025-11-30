/**
 * Token management utilities for the URL shortener application
 * Provides cryptographically secure token generation and validation
 */

import { randomBytes, timingSafeEqual } from 'crypto';
import { createClient } from 'redis';
import { AppError, ErrorCode } from './errors';
import { ManagementToken } from './types';

// Redis client for token operations
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
 * Generates a cryptographically secure management token
 * Uses Node.js crypto.randomBytes for secure random generation
 * @returns A base64url-encoded token string
 */
export function generateManagementToken(): string {
  // Generate 32 random bytes for high entropy
  const tokenBytes = randomBytes(32);
  // Use base64url encoding (URL-safe, no padding)
  return tokenBytes.toString('base64url');
}

/**
 * Validates a management token using timing-safe comparison
 * Prevents timing attacks by ensuring constant-time comparison
 * @param provided - The token provided by the client
 * @param stored - The token stored in the system
 * @returns True if tokens match, false otherwise
 */
export function validateTokenTiming(provided: string, stored: string): boolean {
  // Ensure both tokens are strings and have the same length
  if (typeof provided !== 'string' || typeof stored !== 'string') {
    return false;
  }
  
  if (provided.length !== stored.length) {
    return false;
  }
  
  try {
    // Convert strings to buffers for timing-safe comparison
    const providedBuffer = Buffer.from(provided, 'utf8');
    const storedBuffer = Buffer.from(stored, 'utf8');
    
    // Use Node.js built-in timing-safe comparison
    return timingSafeEqual(providedBuffer, storedBuffer);
  } catch {
    // If any error occurs during comparison, return false
    return false;
  }
}

/**
 * Stores a management token to link ID mapping in Redis
 * @param token - The management token
 * @param linkId - The associated link ID
 * @param ttl - Optional time-to-live in seconds (default: no expiration)
 */
export async function storeTokenMapping(
  token: string, 
  linkId: string, 
  ttl?: number
): Promise<void> {
  await ensureConnection();
  
  const key = `token:${token}`;
  const tokenData: ManagementToken = {
    token,
    linkId,
    createdAt: new Date(),
    lastAccessed: new Date()
  };
  
  const serializedData = JSON.stringify({
    ...tokenData,
    createdAt: tokenData.createdAt.toISOString(),
    lastAccessed: tokenData.lastAccessed.toISOString()
  });
  
  if (ttl) {
    await client.setEx(key, ttl, serializedData);
  } else {
    await client.set(key, serializedData);
  }
}

/**
 * Retrieves the link ID associated with a management token
 * Updates the lastAccessed timestamp for the token
 * @param token - The management token to look up
 * @returns The associated link ID or null if token not found
 */
export async function getLinkIdByToken(token: string): Promise<string | null> {
  await ensureConnection();
  
  const key = `token:${token}`;
  const tokenData = await client.get(key);
  
  if (!tokenData) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(tokenData);
    const managementToken: ManagementToken = {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      lastAccessed: new Date(parsed.lastAccessed)
    };
    
    // Update last accessed timestamp
    const updatedToken = {
      ...managementToken,
      lastAccessed: new Date()
    };
    
    const updatedData = JSON.stringify({
      ...updatedToken,
      createdAt: updatedToken.createdAt.toISOString(),
      lastAccessed: updatedToken.lastAccessed.toISOString()
    });
    
    // Update the token data with new lastAccessed time
    await client.set(key, updatedData);
    
    return managementToken.linkId;
  } catch (error) {
    console.error('Error parsing token data:', error);
    // Remove corrupted token data
    await client.del(key);
    return null;
  }
}

/**
 * Validates a management token and returns the associated link ID
 * Combines token lookup and validation in a single operation
 * @param token - The management token to validate
 * @returns The associated link ID
 * @throws AppError if token is invalid or not found
 */
export async function validateManagementToken(token: string): Promise<string> {
  if (!token || typeof token !== 'string') {
    throw new AppError(
      ErrorCode.INVALID_TOKEN,
      'Management token is required',
      401
    );
  }
  
  if (token.length < 10) {
    throw new AppError(
      ErrorCode.INVALID_TOKEN,
      'Invalid management token format',
      401
    );
  }
  
  const linkId = await getLinkIdByToken(token);
  
  if (!linkId) {
    throw new AppError(
      ErrorCode.INVALID_TOKEN,
      'Invalid or expired management token',
      401
    );
  }
  
  return linkId;
}

/**
 * Removes a management token from Redis storage
 * Used when deleting links or revoking access
 * @param token - The management token to remove
 */
export async function removeTokenMapping(token: string): Promise<void> {
  await ensureConnection();
  
  const key = `token:${token}`;
  await client.del(key);
}

/**
 * Retrieves all tokens associated with a specific link ID
 * Useful for cleanup operations when deleting links
 * @param linkId - The link ID to find tokens for
 * @returns Array of management tokens associated with the link
 */
export async function getTokensByLinkId(linkId: string): Promise<string[]> {
  await ensureConnection();
  
  const pattern = 'token:*';
  const keys = await client.keys(pattern);
  const tokens: string[] = [];
  
  for (const key of keys) {
    const tokenData = await client.get(key);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        if (parsed.linkId === linkId) {
          tokens.push(parsed.token);
        }
      } catch {
        // Skip corrupted token data
        continue;
      }
    }
  }
  
  return tokens;
}

/**
 * Cleans up expired tokens based on creation date
 * Should be run periodically to maintain database hygiene
 * @param maxAgeInDays - Maximum age of tokens in days (default: 365)
 */
export async function cleanupExpiredTokens(maxAgeInDays: number = 365): Promise<number> {
  await ensureConnection();
  
  const pattern = 'token:*';
  const keys = await client.keys(pattern);
  let deletedCount = 0;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
  
  for (const key of keys) {
    const tokenData = await client.get(key);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        const createdAt = new Date(parsed.createdAt);
        
        if (createdAt < cutoffDate) {
          await client.del(key);
          deletedCount++;
        }
      } catch {
        // Remove corrupted token data
        await client.del(key);
        deletedCount++;
      }
    }
  }
  
  return deletedCount;
}

// Export the Redis client for use in other modules
export { client as tokenRedisClient };