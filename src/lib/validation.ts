/**
 * Validation utilities for the URL shortener application
 * Provides helper functions for common validation scenarios
 */

import { z } from "zod";
import { createHash } from "crypto";
import { AppError, ErrorCode, createValidationError } from "./errors";

// Utility function to validate and parse data with Zod schemas
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const message = errorMessage || firstError?.message || "Validation failed";
      throw createValidationError(message);
    }
    throw error;
  }
}

// Safe validation that returns a result object instead of throwing
export function safeValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        success: false, 
        error: firstError?.message || "Validation failed" 
      };
    }
    return { 
      success: false, 
      error: "An unexpected validation error occurred" 
    };
  }
}

// Custom alias validation with detailed error messages
export function validateCustomAlias(alias: string): void {
  if (alias.length < 3) {
    throw new AppError(
      ErrorCode.ALIAS_TOO_SHORT,
      "Custom alias must be at least 3 characters long",
      400
    );
  }

  if (alias.length > 50) {
    throw new AppError(
      ErrorCode.ALIAS_TOO_LONG,
      "Custom alias cannot exceed 50 characters",
      400
    );
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
    throw new AppError(
      ErrorCode.ALIAS_INVALID_FORMAT,
      "Custom alias can only contain letters, numbers, hyphens, and underscores",
      400
    );
  }
}

// URL validation with enhanced checks
export function validateUrl(url: string): void {
  try {
    const parsedUrl = new URL(url);
    
    // Check for valid protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new AppError(
        ErrorCode.INVALID_URL,
        "URL must use HTTP or HTTPS protocol",
        400
      );
    }

    // Check URL length
    if (url.length > 512) {
      throw new AppError(
        ErrorCode.INVALID_URL,
        "URL is too long (maximum 512 characters)",
        400
      );
    }

    // Basic malicious URL checks
    const hostname = parsedUrl.hostname.toLowerCase();
    const suspiciousPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1'
    ];

    if (suspiciousPatterns.some(pattern => hostname.includes(pattern))) {
      throw new AppError(
        ErrorCode.INVALID_URL,
        "Local URLs are not allowed",
        400
      );
    }

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCode.INVALID_URL,
      "The provided URL is invalid or malformed",
      400
    );
  }
}

// Expiration date validation
export function validateExpirationDate(date: Date): void {
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(now.getFullYear() + 10); // Max 10 years in future

  if (date <= now) {
    throw new AppError(
      ErrorCode.EXPIRATION_DATE_INVALID,
      "Expiration date must be in the future",
      400
    );
  }

  if (date > maxFutureDate) {
    throw new AppError(
      ErrorCode.EXPIRATION_DATE_INVALID,
      "Expiration date cannot be more than 10 years in the future",
      400
    );
  }
}

// Management token validation
export function validateManagementToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new AppError(
      ErrorCode.INVALID_TOKEN,
      "Management token is required",
      401
    );
  }

  if (token.length < 10) {
    throw new AppError(
      ErrorCode.INVALID_TOKEN,
      "Invalid management token format",
      401
    );
  }
}

// IP address anonymization for privacy
export function anonymizeIpAddress(ip: string): string {
  try {
    if (ip.includes(':')) {
      // IPv6 - keep first 64 bits, zero out the rest
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::';
    } else {
      // IPv4 - keep first 3 octets, zero out the last
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.0';
    }
  } catch {
    return 'unknown';
  }
}

// Generate fingerprint for unique visitor tracking
export function generateFingerprint(ip: string, userAgent: string): string {
  const data = `${anonymizeIpAddress(ip)}:${userAgent}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}