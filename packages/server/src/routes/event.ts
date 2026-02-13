import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Bus } from '../bus/index.ts';
import { lazy } from '../util/lazy.ts';

const HEARTBEAT_INTERVAL_MS = 30_000;

export const EventRoutes = lazy(() =>
  new Hono().get('/', async (c) => {
    return streamSSE(c, async (stream) => {
      // Initial connection event
      await stream.writeSSE({
        data: JSON.stringify({ type: 'server.connected', properties: {} }),
      });

      const unsub = Bus.subscribeAll(async (event) => {
        await stream.writeSSE({ data: JSON.stringify(event) });
      });

      const heartbeat = setInterval(() => {
        stream.writeSSE({
          data: JSON.stringify({ type: 'server.heartbeat', properties: {} }),
        });
      }, HEARTBEAT_INTERVAL_MS);

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(heartbeat);
          unsub();
          resolve();
        });
      });
    });
  }),
);
