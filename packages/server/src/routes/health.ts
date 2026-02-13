import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod/v4';
import { lazy } from '../util/lazy.ts';

const VERSION = '2.0.0';

export const HealthRoutes = lazy(() =>
  new Hono().get(
    '/',
    describeRoute({
      summary: 'Health check',
      operationId: 'health.get',
      responses: {
        200: {
          description: 'Server is healthy',
          content: { 'application/json': { schema: resolver(z.object({ ok: z.literal(true), version: z.string() })) } },
        },
      },
    }),
    (c) => c.json({ ok: true as const, version: VERSION }),
  ),
);
