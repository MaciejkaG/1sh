import { nanoid } from "nanoid";
import { createClient } from "redis";
import { generateManagementToken, storeTokenMapping } from "./token";
import { AppError, ErrorCode } from "./errors";
import { StoredLink, Link } from "./types";
import { storedLinkSchema } from "./schemas";

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

client.on("error", (err: unknown) => console.log("Redis Client Error", err));

await client.connect();

export interface CreateLinkOptions {
  url: string;
  customAlias?: string;
  expiresAt?: Date;
}

export interface CreateLinkResult {
  id: string;
  shortCode: string;
  managementToken: string;
  customAlias?: string;
}

export async function createLink(options: CreateLinkOptions): Promise<CreateLinkResult> {
  const { url, customAlias, expiresAt } = options;
  
  // Generate short code or use custom alias
  let shortCode: string;
  
  if (customAlias) {
    // Check if custom alias is available
    const isAvailable = await isAliasAvailable(customAlias);
    if (!isAvailable) {
      throw new AppError(
        ErrorCode.ALIAS_TAKEN,
        `The custom alias "${customAlias}" is already in use`,
        409
      );
    }
    shortCode = customAlias;
  } else {
    // Generate a unique short code
    shortCode = await generateUniqueShortCode();
  }
  
  // Generate unique link ID and management token
  const id = nanoid(12); // Longer ID for better uniqueness
  const managementToken = generateManagementToken();
  
  // Create link data
  const linkData: StoredLink = {
    id,
    originalUrl: url,
    shortCode,
    customAlias,
    managementToken,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt?.toISOString(),
    isActive: true,
  };
  
  // Store link data in Redis
  const linkKey = `link:${shortCode}`;
  const linkDataJson = JSON.stringify(linkData);
  
  if (expiresAt) {
    // Calculate TTL in seconds
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await client.setEx(linkKey, ttl, linkDataJson);
    } else {
      throw new AppError(
        ErrorCode.EXPIRATION_DATE_INVALID,
        'Expiration date must be in the future',
        400
      );
    }
  } else {
    await client.set(linkKey, linkDataJson);
  }
  
  // Store custom alias mapping if provided
  if (customAlias) {
    await client.set(`alias:${customAlias}`, id);
    if (expiresAt) {
      const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await client.expire(`alias:${customAlias}`, ttl);
      }
    }
  }
  
  // Store management token mapping
  await storeTokenMapping(managementToken, id);
  
  return {
    id,
    shortCode,
    managementToken,
    customAlias,
  };
}

export async function getURL(linkId: string): Promise<string | null> {
  const linkData = await client.get(`link:${linkId}`);
  
  if (!linkData) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(linkData);
    const link = storedLinkSchema.parse(parsed);
    
    // Check if link is active
    if (!link.isActive) {
      return null;
    }
    
    // Check if link has expired
    if (link.expiresAt) {
      const expirationDate = new Date(link.expiresAt);
      if (expirationDate <= new Date()) {
        // Link has expired, deactivate it
        await deactivateLink(linkId);
        return null;
      }
    }
    
    return link.originalUrl;
  } catch (error) {
    console.error('Error parsing link data:', error);
    return null;
  }
}

export async function getLinkData(shortCode: string): Promise<Link | null> {
  const linkData = await client.get(`link:${shortCode}`);
  
  if (!linkData) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(linkData);
    const storedLink = storedLinkSchema.parse(parsed);
    
    // Get analytics data
    let clickCount = 0;
    let uniqueVisitors = 0;
    
    try {
      const analyticsKey = `analytics:${storedLink.id}`;
      const analyticsData = await client.hGetAll(analyticsKey);
      clickCount = parseInt(analyticsData.totalClicks || '0', 10);
      uniqueVisitors = parseInt(analyticsData.uniqueVisitors || '0', 10);
    } catch (analyticsError) {
      console.error('Error retrieving analytics data:', analyticsError);
      // Continue with default values
    }
    
    // Convert stored link to Link interface
    const link: Link = {
      ...storedLink,
      createdAt: new Date(storedLink.createdAt),
      expiresAt: storedLink.expiresAt ? new Date(storedLink.expiresAt) : undefined,
      clickCount,
      uniqueVisitors,
    };
    
    return link;
  } catch (error) {
    console.error('Error parsing link data:', error);
    return null;
  }
}

export async function isAliasAvailable(alias: string): Promise<boolean> {
  // Check if alias exists as a custom alias
  const aliasExists = await client.exists(`alias:${alias}`);
  if (aliasExists) {
    return false;
  }
  
  // Check if alias exists as a generated short code
  const linkExists = await client.exists(`link:${alias}`);
  return !linkExists;
}

export async function generateUniqueShortCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const shortCode = nanoid(6);
    const exists = await client.exists(`link:${shortCode}`);
    
    if (!exists) {
      return shortCode;
    }
    
    attempts++;
  }
  
  // If we can't generate a unique code after max attempts, use a longer one
  return nanoid(8);
}

export async function deactivateLink(shortCode: string): Promise<void> {
  const linkData = await client.get(`link:${shortCode}`);
  
  if (linkData) {
    try {
      const parsed = JSON.parse(linkData);
      const link = storedLinkSchema.parse(parsed);
      
      // Update the link to be inactive
      const updatedLink: StoredLink = {
        ...link,
        isActive: false,
      };
      
      await client.set(`link:${shortCode}`, JSON.stringify(updatedLink));
    } catch (error) {
      console.error('Error deactivating link:', error);
    }
  }
}

/**
 * Get multiple links by their management tokens
 */
export async function getLinksByTokens(tokens: string[]): Promise<Link[]> {
  const links: Link[] = [];
  
  for (const token of tokens) {
    try {
      // Get link ID from token
      const { getLinkIdByToken } = await import('./token');
      const linkId = await getLinkIdByToken(token);
      
      if (linkId) {
        // Get link data by searching for the link with this ID
        const pattern = 'link:*';
        const keys = await client.keys(pattern);
        
        for (const key of keys) {
          const linkData = await client.get(key);
          if (linkData) {
            try {
              const parsed = JSON.parse(linkData);
              const storedLink = storedLinkSchema.parse(parsed);
              
              if (storedLink.id === linkId) {
                // Get analytics data
                let clickCount = 0;
                let uniqueVisitors = 0;
                
                try {
                  const analyticsKey = `analytics:${storedLink.id}`;
                  const analyticsData = await client.hGetAll(analyticsKey);
                  clickCount = parseInt(analyticsData.totalClicks || '0', 10);
                  uniqueVisitors = parseInt(analyticsData.uniqueVisitors || '0', 10);
                } catch (analyticsError) {
                  console.error('Error retrieving analytics data:', analyticsError);
                }
                
                // Convert stored link to Link interface
                const link: Link = {
                  ...storedLink,
                  createdAt: new Date(storedLink.createdAt),
                  expiresAt: storedLink.expiresAt ? new Date(storedLink.expiresAt) : undefined,
                  clickCount,
                  uniqueVisitors,
                };
                
                links.push(link);
                break;
              }
            } catch (parseError) {
              console.error('Error parsing link data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing token:', token, error);
    }
  }
  
  return links;
}

/**
 * Delete a link by its management token
 */
export async function deleteLinkByToken(token: string): Promise<boolean> {
  try {
    // Get link ID from token
    const { getLinkIdByToken, removeTokenMapping } = await import('./token');
    const linkId = await getLinkIdByToken(token);
    
    if (!linkId) {
      return false;
    }
    
    // Find and delete the link
    const pattern = 'link:*';
    const keys = await client.keys(pattern);
    
    for (const key of keys) {
      const linkData = await client.get(key);
      if (linkData) {
        try {
          const parsed = JSON.parse(linkData);
          const storedLink = storedLinkSchema.parse(parsed);
          
          if (storedLink.id === linkId) {
            // Delete the link
            await client.del(key);
            
            // Delete custom alias mapping if exists
            if (storedLink.customAlias) {
              await client.del(`alias:${storedLink.customAlias}`);
            }
            
            // Delete analytics data
            await client.del(`analytics:${linkId}`);
            await client.del(`unique:${linkId}`);
            
            // Delete click events (scan for all date keys)
            const clickPattern = `clicks:${linkId}:*`;
            const clickKeys = await client.keys(clickPattern);
            if (clickKeys.length > 0) {
              await client.del(clickKeys);
            }
            
            // Remove token mapping
            await removeTokenMapping(token);
            
            return true;
          }
        } catch (parseError) {
          console.error('Error parsing link data during deletion:', parseError);
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting link by token:', error);
    return false;
  }
}

/**
 * Generate CSV data for links and their analytics
 */
export async function generateLinksCSV(links: Link[]): Promise<string> {
  const headers = [
    'ID',
    'Short Code',
    'Custom Alias',
    'Original URL',
    'Created At',
    'Expires At',
    'Is Active',
    'Total Clicks',
    'Unique Visitors'
  ];
  
  const rows = links.map(link => [
    link.id,
    link.shortCode,
    link.customAlias || '',
    link.originalUrl,
    link.createdAt.toISOString(),
    link.expiresAt?.toISOString() || '',
    link.isActive.toString(),
    link.clickCount.toString(),
    link.uniqueVisitors.toString()
  ]);
  
  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(field => 
        // Escape fields that contain commas, quotes, or newlines
        field.includes(',') || field.includes('"') || field.includes('\n')
          ? `"${field.replace(/"/g, '""')}"`
          : field
      ).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

// Legacy function for backward compatibility
export async function createLinkLegacy(link: string): Promise<string> {
  const result = await createLink({ url: link });
  return result.shortCode;
}
