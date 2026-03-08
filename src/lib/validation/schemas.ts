/**
 * Zod Validation Schemas for API Endpoints
 * Provides comprehensive input validation and sanitization
 */

import { z } from 'zod';

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

/**
 * Common string validations
 */
const RequiredString = z.string().min(1, 'This field is required').trim();
const OptionalString = z.string().optional();
const EmailSchema = z.string().email('Invalid email address').toLowerCase();
const UrlSchema = z.string().url('Invalid URL format');

/**
 * Firebase ID schema (Firestore document IDs)
 */
const FirebaseIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Firebase document ID')
  .min(1)
  .max(128);

/**
 * Transcription mode validation
 */
const TranscriptionModeSchema = z.enum(['ai', 'hybrid', 'human'], {
  errorMap: () => ({ message: 'Mode must be ai, hybrid, or human' }),
});

/**
 * Transcription domain validation
 */
const TranscriptionDomainSchema = z.enum(['general', 'medical', 'legal', 'technical'], {
  errorMap: () => ({ message: 'Domain must be general, medical, legal, or technical' }),
});

/**
 * Transcription status validation
 */
const TranscriptionStatusSchema = z.enum([
  'processing',
  'pending-review',
  'pending-transcription',
  'complete',
  'failed'
], {
  errorMap: () => ({ message: 'Invalid transcription status' }),
});

// =============================================================================
// TRANSCRIPTION API SCHEMAS
// =============================================================================

/**
 * Schema for creating transcription jobs
 * POST /api/transcriptions/create
 */
export const CreateTranscriptionJobSchema = z.object({
  filename: RequiredString.max(255, 'Filename too long'),
  originalFilename: RequiredString.max(255, 'Original filename too long'),
  filePath: RequiredString.max(500, 'File path too long'),
  downloadURL: UrlSchema.max(1000, 'Download URL too long'),
  status: TranscriptionStatusSchema,
  mode: TranscriptionModeSchema,
  domain: TranscriptionDomainSchema.optional(),
  language: z.string().max(10).optional(), // Language code (e.g., 'en', 'fr')
  duration: z.number()
    .min(0, 'Duration cannot be negative')
    .max(86400, 'Duration cannot exceed 24 hours'), // 24 hours in seconds
  creditsUsed: z.number()
    .int('Credits must be an integer')
    .min(0, 'Credits cannot be negative')
    .max(100000, 'Credits too high'), // Increased to 100,000 to support longer files
  specialInstructions: z.string()
    .max(1000, 'Special instructions too long')
    .optional(),
  // Template metadata fields
  clientName: z.string()
    .max(200, 'Client name too long')
    .optional(),
  projectName: z.string()
    .max(200, 'Project name too long')
    .optional(),
  providerName: z.string()
    .max(200, 'Provider name too long')
    .optional(),
  patientName: z.string()
    .max(200, 'Patient name too long')
    .optional(),
  location: z.string()
    .max(200, 'Location too long')
    .optional(),
  recordingTime: z.string()
    .max(50, 'Recording time too long')
    .optional(),
  // Filler words option
  includeFiller: z.boolean().optional(),
  // Add-on options
  rushDelivery: z.boolean().optional(),
  multipleSpeakers: z.boolean().optional(),
  speakerCount: z.number().int().min(2).max(20).optional(),
  addOnCost: z.number().min(0).optional(),
  hasPackage: z.boolean().optional(),
  // Template file for human transcription
  templatePath: z.string().max(500).optional(),
  templateURL: z.string().url().max(1000).optional(),
  templateFilename: z.string().max(255).optional(),
  userId: z.string().optional(), // Will be overridden by authenticated user
});

/**
 * Schema for processing transcription jobs
 * POST /api/transcriptions/process
 */
export const ProcessTranscriptionJobSchema = z.object({
  jobId: FirebaseIdSchema,
  language: z.string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code')
    .default('en'),
  operatingPoint: z.enum(['standard', 'enhanced'], {
    errorMap: () => ({ message: 'Operating point must be standard or enhanced' }),
  }).default('standard'),
});

// =============================================================================
// AUTH API SCHEMAS
// =============================================================================

/**
 * Schema for user authentication
 * POST /api/auth/signin
 */
export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Schema for user registration
 * POST /api/auth/signup
 */
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: RequiredString.max(100, 'Name too long'),
  confirmPassword: RequiredString,
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Schema for password reset
 * POST /api/auth/forgot-password
 */
export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

// =============================================================================
// BILLING API SCHEMAS
// =============================================================================

// Legacy payment intent schemas removed - now using Stripe Checkout Sessions

// =============================================================================
// SUBSCRIPTION API SCHEMAS
// =============================================================================

/**
 * Plan ID validation
 */
const PlanIdSchema = z.enum([
  'ai-starter',
  'ai-professional',
  'ai-enterprise',
  'hybrid-starter',
  'hybrid-professional',
  'hybrid-enterprise',
], {
  errorMap: () => ({ message: 'Invalid plan ID' }),
});

/**
 * Subscription status validation
 */
const SubscriptionStatusSchema = z.enum([
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'trialing',
  'none',
], {
  errorMap: () => ({ message: 'Invalid subscription status' }),
});

/**
 * Schema for creating subscriptions
 * POST /api/subscriptions/create
 */
export const CreateSubscriptionSchema = z.object({
  planId: PlanIdSchema,
  paymentMethodId: z.string().max(255, 'Payment method ID too long').nullable().optional(),
});

/**
 * Schema for updating/changing subscriptions
 * POST /api/subscriptions/update
 */
export const UpdateSubscriptionSchema = z.object({
  subscriptionId: RequiredString.max(255, 'Subscription ID too long'),
  newPlanId: PlanIdSchema,
  prorate: z.boolean().optional().default(true),
});

/**
 * Schema for canceling subscriptions
 * POST /api/subscriptions/cancel
 */
export const CancelSubscriptionSchema = z.object({
  subscriptionId: RequiredString.max(255, 'Subscription ID too long'),
  immediate: z.boolean().optional().default(false),
  cancellationReason: z.string().max(500, 'Reason too long').optional(),
});

/**
 * Schema for fetching subscription usage
 * GET /api/subscriptions/usage
 */
export const GetSubscriptionUsageSchema = z.object({
  subscriptionId: RequiredString.max(255, 'Subscription ID too long').optional(),
});

/**
 * Schema for previewing plan changes
 * POST /api/subscriptions/preview
 */
export const PreviewPlanChangeSchema = z.object({
  currentPlanId: PlanIdSchema,
  newPlanId: PlanIdSchema,
  subscriptionId: RequiredString.max(255, 'Subscription ID too long'),
});

/**
 * Schema for tracking usage
 * POST /api/usage/track
 */
export const TrackUsageSchema = z.object({
  transcriptionId: FirebaseIdSchema,
  minutes: z.number()
    .min(0, 'Minutes cannot be negative')
    .max(1440, 'Duration cannot exceed 24 hours'), // 1440 minutes = 24 hours
  mode: TranscriptionModeSchema,
  recordingDate: z.string().datetime().optional(),
  filename: z.string().max(255, 'Filename too long').optional(),
});

/**
 * Schema for resetting monthly usage
 * POST /api/usage/reset (Admin only)
 */
export const ResetUsageSchema = z.object({
  userId: FirebaseIdSchema,
  subscriptionId: RequiredString.max(255, 'Subscription ID too long'),
});

// =============================================================================
// ADMIN API SCHEMAS
// =============================================================================

/**
 * Schema for admin job processing
 * POST /api/admin/process-job
 */
export const AdminProcessJobSchema = z.object({
  jobId: FirebaseIdSchema,
  language: z.string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code')
    .default('en'),
  operatingPoint: z.enum(['standard', 'enhanced']).default('standard'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});


// =============================================================================
// GENERAL API SCHEMAS
// =============================================================================

/**
 * Schema for file uploads (metadata validation)
 */
export const FileUploadSchema = z.object({
  filename: RequiredString.max(255),
  size: z.number()
    .int('Size must be an integer')
    .min(1, 'File cannot be empty')
    .max(1073741824, 'File cannot exceed 1GB'), // 1GB
  type: z.string()
    .regex(/^(audio|video)\//, 'File must be audio or video')
    .max(100),
});

/**
 * Schema for pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(val => Math.max(1, parseInt(val)))
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(val => Math.min(100, Math.max(1, parseInt(val))))
    .default('10'),
});

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validates data against schema and returns parsed data
 */
export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Extract error messages from Zod error
    const errors: string[] = [];
    console.error('[Validation] Raw Zod error:', JSON.stringify(result.error, null, 2));
    console.error('[Validation] Error issues:', result.error.issues);

    if (result.error && result.error.issues) {
      for (const err of result.error.issues) {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        errors.push(`${path}${err.message}`);
      }
    }

    if (errors.length === 0) {
      errors.push('Validation failed');
    }

    console.error('[Validation] Extracted errors:', errors);

    return { success: false, errors };
  }
}

/**
 * Validates request body against schema and returns parsed data
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const body = await request.json();
    return validateData(body, schema);
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid JSON in request body']
    };
  }
}

/**
 * Validates query parameters against schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid query parameters']
    };
  }
}

/**
 * Sanitizes HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes user input
 */
export function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input.trim());
}