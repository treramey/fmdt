import type { AuthStore } from '@fmdt/core';
import { AuthInfoSchema, ProviderTypeSchema } from '@fmdt/core';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod/v4';
import { lazy } from '../util/lazy.ts';

export function createAuthRoutes(authStore: AuthStore) {
  return lazy(() =>
    new Hono()
      .put(
        '/:providerId',
        describeRoute({
          summary: 'Set auth credentials',
          operationId: 'auth.set',
          responses: {
            200: {
              description: 'Credentials saved',
              content: { 'application/json': { schema: resolver(z.object({ ok: z.literal(true) })) } },
            },
          },
        }),
        validator('param', z.object({ providerId: ProviderTypeSchema })),
        validator('json', AuthInfoSchema),
        async (c) => {
          const { providerId } = c.req.valid('param');
          const info = c.req.valid('json');
          await authStore.set(providerId, info);
          return c.json({ ok: true as const });
        },
      )
      .delete(
        '/:providerId',
        describeRoute({
          summary: 'Remove auth credentials',
          operationId: 'auth.remove',
          responses: {
            200: {
              description: 'Credentials removed',
              content: { 'application/json': { schema: resolver(z.object({ ok: z.literal(true) })) } },
            },
          },
        }),
        validator('param', z.object({ providerId: ProviderTypeSchema })),
        async (c) => {
          const { providerId } = c.req.valid('param');
          await authStore.remove(providerId);
          return c.json({ ok: true as const });
        },
      )
      .get(
        '/status',
        describeRoute({
          summary: 'Auth status',
          operationId: 'auth.status',
          responses: {
            200: {
              description: 'Current auth status per provider',
              content: {
                'application/json': {
                  schema: resolver(
                    z.object({
                      providers: z.record(ProviderTypeSchema, z.object({ configured: z.boolean() })),
                    }),
                  ),
                },
              },
            },
          },
        }),
        async (c) => {
          const azureInfo = await authStore.get('azure-devops');
          const githubInfo = await authStore.get('github');
          return c.json({
            providers: {
              'azure-devops': { configured: azureInfo !== null },
              github: { configured: githubInfo !== null },
            },
          });
        },
      ),
  );
}
