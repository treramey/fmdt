import { z } from 'zod/v4';

// --- SSE Event Types ---

export const ScanStartedEventSchema = z.object({
  type: z.literal('scan.started'),
  data: z.object({ totalRepos: z.number().int().min(0) }),
});

export const ScanRepoCompleteEventSchema = z.object({
  type: z.literal('scan.repo.complete'),
  data: z.object({ repo: z.string(), index: z.number().int().min(0) }),
});

export const ScanCompleteEventSchema = z.object({
  type: z.literal('scan.complete'),
  data: z.object({ duration: z.number() }),
});

export const ScanErrorEventSchema = z.object({
  type: z.literal('scan.error'),
  data: z.object({ repo: z.string(), error: z.string() }),
});

export const ServerHeartbeatEventSchema = z.object({
  type: z.literal('server.heartbeat'),
  data: z.object({}),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  ScanStartedEventSchema,
  ScanRepoCompleteEventSchema,
  ScanCompleteEventSchema,
  ScanErrorEventSchema,
  ServerHeartbeatEventSchema,
]);
export type ServerEvent = z.infer<typeof ServerEventSchema>;

// Event type constants for subscription
export const EVENT_TYPES = {
  SCAN_STARTED: 'scan.started',
  SCAN_REPO_COMPLETE: 'scan.repo.complete',
  SCAN_COMPLETE: 'scan.complete',
  SCAN_ERROR: 'scan.error',
  SERVER_HEARTBEAT: 'server.heartbeat',
} as const;
