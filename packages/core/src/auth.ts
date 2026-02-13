import { z } from 'zod/v4';

// --- Auth Info ---

export const PatAuthSchema = z.object({
  type: z.literal('pat'),
  token: z.string().min(1),
});

export const OAuthInfoSchema = z.object({
  type: z.literal('oauth'),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number(),
});

export const AuthInfoSchema = z.discriminatedUnion('type', [PatAuthSchema, OAuthInfoSchema]);
export type AuthInfo = z.infer<typeof AuthInfoSchema>;

// --- Auth Store Interface ---

export interface AuthStore {
  get(providerId: string): Promise<AuthInfo | null>;
  set(providerId: string, info: AuthInfo): Promise<void>;
  remove(providerId: string): Promise<void>;
}
