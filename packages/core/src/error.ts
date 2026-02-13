import { z } from 'zod/v4';

// --- Error Codes ---

export const ErrorCodeSchema = z.enum([
  'AUTH_INVALID',
  'AUTH_MISSING',
  'ORG_NOT_FOUND',
  'PROJECT_NOT_FOUND',
  'REPO_NOT_FOUND',
  'BRANCH_NOT_FOUND',
  'RATE_LIMITED',
  'PROVIDER_ERROR',
  'CONFIG_INVALID',
  'CONFIG_NOT_FOUND',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// --- API Error ---

export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
