/**
 * Client-side token manager for localStorage
 * Provides type-safe management of management tokens in browser storage
 */

import { AppError, ErrorCode } from './errors';

export interface LocalStorageManager {
  tokens: string[];
  addToken(token: string): void;
  removeToken(token: string): void;
  getTokens(): string[];
  clearTokens(): void;
  hasToken(token: string): boolean;
  getTokenCount(): number;
}

/**
 * Type-safe localStorage operations for management tokens
 * Handles all localStorage interactions with proper error handling
 */
export class TokenManager implements LocalStorageManager {
  private readonly STORAGE_KEY = '1sh_management_tokens';
  private readonly MAX_TOKENS = 1000; // Prevent localStorage overflow
  
  public tokens: string[] = [];
  
  constructor() {
    this.loadTokens();
  }
  
  /**
   * Loads tokens from localStorage with error handling
   * Validates and sanitizes stored data
   */
  private loadTokens(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        // Server-side or localStorage not available
        this.tokens = [];
        return;
      }
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (!stored) {
        this.tokens = [];
        return;
      }
      
      const parsed = JSON.parse(stored);
      
      // Validate that parsed data is an array of strings
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        // Filter out invalid tokens and duplicates
        this.tokens = [...new Set(parsed.filter(token => this.isValidTokenFormat(token)))];
        
        // Enforce token limit
        if (this.tokens.length > this.MAX_TOKENS) {
          this.tokens = this.tokens.slice(-this.MAX_TOKENS);
          this.saveTokens();
        }
      } else {
        // Invalid data format, reset to empty array
        this.tokens = [];
        this.saveTokens();
      }
    } catch (error) {
      console.warn('Error loading tokens from localStorage:', error);
      this.tokens = [];
      // Try to clear corrupted data
      this.clearTokens();
    }
  }
  
  /**
   * Saves tokens to localStorage with error handling
   */
  private saveTokens(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const serialized = JSON.stringify(this.tokens);
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Error saving tokens to localStorage:', error);
      
      // Handle quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        // Try to free up space by removing oldest tokens
        this.tokens = this.tokens.slice(-Math.floor(this.MAX_TOKENS / 2));
        try {
          const serialized = JSON.stringify(this.tokens);
          localStorage.setItem(this.STORAGE_KEY, serialized);
        } catch {
          // If still failing, clear all tokens
          this.clearTokens();
        }
      }
    }
  }
  
  /**
   * Validates token format before storage
   * @param token - The token to validate
   * @returns True if token format is valid
   */
  private isValidTokenFormat(token: string): boolean {
    return typeof token === 'string' && 
           token.length >= 10 && 
           token.length <= 200 && 
           /^[A-Za-z0-9_-]+$/.test(token);
  }
  
  /**
   * Adds a new management token to localStorage
   * @param token - The management token to add
   * @throws AppError if token format is invalid
   */
  addToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new AppError(
        ErrorCode.INVALID_TOKEN,
        'Token must be a non-empty string',
        400
      );
    }
    
    if (!this.isValidTokenFormat(token)) {
      throw new AppError(
        ErrorCode.INVALID_TOKEN,
        'Invalid token format',
        400
      );
    }
    
    // Check if token already exists
    if (this.tokens.includes(token)) {
      return; // Token already exists, no need to add
    }
    
    // Check token limit
    if (this.tokens.length >= this.MAX_TOKENS) {
      // Remove oldest token to make space
      this.tokens.shift();
    }
    
    this.tokens.push(token);
    this.saveTokens();
  }
  
  /**
   * Removes a management token from localStorage
   * @param token - The management token to remove
   */
  removeToken(token: string): void {
    if (!token || typeof token !== 'string') {
      return;
    }
    
    const initialLength = this.tokens.length;
    this.tokens = this.tokens.filter(t => t !== token);
    
    // Only save if something was actually removed
    if (this.tokens.length !== initialLength) {
      this.saveTokens();
    }
  }
  
  /**
   * Retrieves all stored management tokens
   * @returns Array of management tokens
   */
  getTokens(): string[] {
    return [...this.tokens]; // Return a copy to prevent external modification
  }
  
  /**
   * Checks if a specific token is stored
   * @param token - The token to check for
   * @returns True if token exists in storage
   */
  hasToken(token: string): boolean {
    return this.tokens.includes(token);
  }
  
  /**
   * Gets the count of stored tokens
   * @returns Number of stored tokens
   */
  getTokenCount(): number {
    return this.tokens.length;
  }
  
  /**
   * Clears all stored management tokens
   */
  clearTokens(): void {
    this.tokens = [];
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error clearing tokens from localStorage:', error);
    }
  }
  
  /**
   * Exports tokens as JSON string for backup purposes
   * @returns JSON string of all tokens
   */
  exportTokens(): string {
    return JSON.stringify(this.tokens);
  }
  
  /**
   * Imports tokens from JSON string
   * @param jsonData - JSON string containing token array
   * @throws AppError if JSON data is invalid
   */
  importTokens(jsonData: string): void {
    try {
      const parsed = JSON.parse(jsonData);
      
      if (!Array.isArray(parsed)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Import data must be an array of tokens',
          400
        );
      }
      
      const validTokens = parsed.filter(token => 
        typeof token === 'string' && this.isValidTokenFormat(token)
      );
      
      // Merge with existing tokens, removing duplicates
      const allTokens = [...new Set([...this.tokens, ...validTokens])];
      
      // Enforce token limit
      if (allTokens.length > this.MAX_TOKENS) {
        this.tokens = allTokens.slice(-this.MAX_TOKENS);
      } else {
        this.tokens = allTokens;
      }
      
      this.saveTokens();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON format for token import',
        400
      );
    }
  }
  
  /**
   * Removes tokens that haven't been used recently
   * This method would need to be enhanced with server-side validation
   * @param maxAge - Maximum age in milliseconds (not implemented in this version)
   */
  cleanupOldTokens(maxAge?: number): void {
    // For now, this is a placeholder
    // In a full implementation, this would validate tokens with the server
    // and remove any that are no longer valid
    console.log('Token cleanup requested, but server validation not implemented');
  }
  
  /**
   * Gets storage usage information
   * @returns Object with storage statistics
   */
  getStorageInfo(): {
    tokenCount: number;
    maxTokens: number;
    storageKey: string;
    estimatedSize: number;
  } {
    const estimatedSize = new Blob([JSON.stringify(this.tokens)]).size;
    
    return {
      tokenCount: this.tokens.length,
      maxTokens: this.MAX_TOKENS,
      storageKey: this.STORAGE_KEY,
      estimatedSize
    };
  }
}

// Singleton instance for use throughout the application
let tokenManagerInstance: TokenManager | null = null;

/**
 * Gets the singleton TokenManager instance
 * Creates a new instance if one doesn't exist
 * @returns TokenManager instance
 */
export function getTokenManager(): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager();
  }
  return tokenManagerInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetTokenManager(): void {
  tokenManagerInstance = null;
}

// Type-safe hooks for React components (if using React)
export interface UseTokenManagerReturn {
  tokens: string[];
  addToken: (token: string) => void;
  removeToken: (token: string) => void;
  clearTokens: () => void;
  hasToken: (token: string) => boolean;
  tokenCount: number;
  exportTokens: () => string;
  importTokens: (jsonData: string) => void;
}

/**
 * React hook for using the token manager (if React is available)
 * This would need to be enhanced with proper React state management
 */
export function useTokenManager(): UseTokenManagerReturn {
  const manager = getTokenManager();
  
  return {
    tokens: manager.getTokens(),
    addToken: (token: string) => manager.addToken(token),
    removeToken: (token: string) => manager.removeToken(token),
    clearTokens: () => manager.clearTokens(),
    hasToken: (token: string) => manager.hasToken(token),
    tokenCount: manager.getTokenCount(),
    exportTokens: () => manager.exportTokens(),
    importTokens: (jsonData: string) => manager.importTokens(jsonData)
  };
}