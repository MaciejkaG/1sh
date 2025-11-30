/**
 * Error handling types and utilities for the URL shortener application
 * Provides comprehensive error codes and custom error class
 */

export enum ErrorCode {
  INVALID_URL = 'INVALID_URL',
  ALIAS_TAKEN = 'ALIAS_TAKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  LINK_NOT_FOUND = 'LINK_NOT_FOUND',
  LINK_EXPIRED = 'LINK_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  ALIAS_INVALID_FORMAT = 'ALIAS_INVALID_FORMAT',
  ALIAS_TOO_SHORT = 'ALIAS_TOO_SHORT',
  ALIAS_TOO_LONG = 'ALIAS_TOO_LONG',
  EXPIRATION_DATE_INVALID = 'EXPIRATION_DATE_INVALID',
  TURNSTILE_VERIFICATION_FAILED = 'TURNSTILE_VERIFICATION_FAILED',
  ANALYTICS_ERROR = 'ANALYTICS_ERROR'
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Predefined error instances for common scenarios
export const CommonErrors = {
  INVALID_URL: new AppError(
    ErrorCode.INVALID_URL,
    'The provided URL is invalid or malformed',
    400
  ),
  ALIAS_TAKEN: new AppError(
    ErrorCode.ALIAS_TAKEN,
    'The custom alias is already in use',
    409
  ),
  INVALID_TOKEN: new AppError(
    ErrorCode.INVALID_TOKEN,
    'The management token is invalid or expired',
    401
  ),
  LINK_NOT_FOUND: new AppError(
    ErrorCode.LINK_NOT_FOUND,
    'The requested link was not found',
    404
  ),
  LINK_EXPIRED: new AppError(
    ErrorCode.LINK_EXPIRED,
    'The link has expired and is no longer accessible',
    410
  ),
  RATE_LIMITED: new AppError(
    ErrorCode.RATE_LIMITED,
    'Too many requests. Please try again later',
    429
  ),
  SERVER_ERROR: new AppError(
    ErrorCode.SERVER_ERROR,
    'An internal server error occurred',
    500,
    false
  ),
  UNAUTHORIZED: new AppError(
    ErrorCode.UNAUTHORIZED,
    'Authentication is required to access this resource',
    401
  ),
  FORBIDDEN: new AppError(
    ErrorCode.FORBIDDEN,
    'You do not have permission to access this resource',
    403
  ),
  TURNSTILE_VERIFICATION_FAILED: new AppError(
    ErrorCode.TURNSTILE_VERIFICATION_FAILED,
    'Captcha verification failed. Please try again',
    400
  )
} as const;

// Type-safe error handling utility
export function handleApiError(error: unknown): {
  success: false;
  error: string;
  code: string;
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    };
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      success: false,
      error: 'Validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400
    };
  }

  // Handle unknown errors
  console.error('Unexpected error:', error);
  return {
    success: false,
    error: 'An unexpected error occurred',
    code: ErrorCode.SERVER_ERROR,
    statusCode: 500
  };
}

// Type guard to check if an error is an AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Utility to create validation errors
export function createValidationError(message: string): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, 400);
}