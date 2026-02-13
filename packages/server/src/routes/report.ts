import type { AuthStore } from '@fmdt/core';
import { BranchReportRequestSchema, EnvReportRequestSchema } from '@fmdt/core';
import { Hono } from 'hono';
import { executeBranchReport } from '../report/branch.ts';
import { executeEnvironmentReport } from '../report/environment.ts';
import { lazy } from '../util/lazy.ts';

export const createReportRoutes = (authStore: AuthStore) =>
  lazy(() => {
    const app = new Hono();

    app.post('/branch', async (c) => {
      const body = await c.req.json();
      const parsed = BranchReportRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
      }
      const results = await executeBranchReport({ authStore }, parsed.data);
      return c.json(results);
    });

    app.post('/environment', async (c) => {
      const body = await c.req.json();
      const parsed = EnvReportRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
      }
      const report = await executeEnvironmentReport({ authStore }, parsed.data);
      return c.json(report);
    });

    return app;
  });
