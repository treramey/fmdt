import { z } from 'zod/v4';
import { BusEvent } from './bus-event.ts';

export const ScanStarted = BusEvent.define('scan.started', z.object({ totalRepos: z.number().int().min(0) }));

export const ScanRepoComplete = BusEvent.define(
  'scan.repo.complete',
  z.object({ repo: z.string(), index: z.number().int().min(0) }),
);

export const ScanComplete = BusEvent.define('scan.complete', z.object({ duration: z.number() }));

export const ScanError = BusEvent.define('scan.error', z.object({ repo: z.string(), error: z.string() }));

export const ServerHeartbeat = BusEvent.define('server.heartbeat', z.object({}));
