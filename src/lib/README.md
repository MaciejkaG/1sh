# URL Shortener Library

This directory contains the core type definitions, schemas, and utilities for the URL shortener application.

## Files Overview

### `types.ts`
Comprehensive TypeScript interfaces including:
- `Link` - Core link entity with management tokens and analytics
- `ClickEvent` - Click tracking with device and geographic data
- `Analytics` - Aggregated analytics data structure
- `ManagementToken` - Token-based link management
- Storage interfaces for Redis serialization
- API response interfaces

### `schemas.ts`
Enhanced Zod validation schemas:
- `createLinkSchema` - Link creation with custom aliases and expiration
- `clickEventSchema` - Click event recording validation
- `analyticsQuerySchema` - Analytics query parameters
- `bulkLinkQuerySchema` - Bulk operations support
- Storage schemas for data persistence

### `errors.ts`
Comprehensive error handling:
- `ErrorCode` enum with all possible error types
- `AppError` class for structured error handling
- Predefined common errors
- Type-safe error handling utilities

### `validation.ts`
Validation utilities:
- Schema validation helpers
- Custom alias validation
- URL validation with security checks
- IP anonymization for privacy
- Fingerprint generation for unique visitors

### `index.ts`
Centralized exports for easy importing across the application.

## Usage

```typescript
import { 
  Link, 
  createLinkSchema, 
  AppError, 
  ErrorCode,
  validateData 
} from '@/lib';

// Validate input data
const linkData = validateData(createLinkSchema, userInput);

// Handle errors
try {
  // ... operation
} catch (error) {
  if (error instanceof AppError) {
    console.log(`Error ${error.code}: ${error.message}`);
  }
}
```

## Requirements Satisfied

- **2.2**: Custom alias validation and format checking
- **2.4**: Expiration date support with validation
- **5.1**: Management token generation and validation
- **5.2**: Token-based link management system