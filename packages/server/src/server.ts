import type { AuthStore } from '@fmdt/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuthRoutes } from './routes/auth.ts';
import { ConfigRoutes } from './routes/config.ts';
import { createDiscoverRoutes } from './routes/discover.ts';
import { EventRoutes } from './routes/event.ts';
import { HealthRoutes } from './routes/health.ts';
import { HistoryRoutes } from './routes/history.ts';
import { createReportRoutes } from './routes/report.ts';
import { lazy } from './util/lazy.ts';

// Ensure bus events are registered on import
import './bus/events.ts';

export interface ServerOptions {
  authStore: AuthStore;
}

export const createApp = (opts: ServerOptions) =>
  lazy(() => {
    const app = new Hono();

    app.onError((err, c) => {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ code: 'INTERNAL_ERROR', message }, 500);
    });

    app.use(
      cors({
        origin: (origin) => {
          if (!origin) return undefined;
          if (origin.startsWith('http://localhost:')) return origin;
          if (origin.startsWith('http://127.0.0.1:')) return origin;
          return undefined;
        },
      }),
    );

    app.route('/health', HealthRoutes());
    app.route('/auth', createAuthRoutes(opts.authStore)());
    app.route('/event', EventRoutes());
    app.route('/config', ConfigRoutes());
    app.route('/report', createReportRoutes(opts.authStore)());
    app.route('/discover', createDiscoverRoutes(opts.authStore)());
    app.route('/history', HistoryRoutes());

    return app;
  });
