import { Bus, createApp, createKeyringAuthStore } from '@fmdt/server';
import { Rpc } from './rpc.ts';

const authStore = createKeyringAuthStore();
const app = createApp({ authStore });

// Reason: Forward all bus events to main thread via RPC for TUI progress display
Bus.subscribeAll(async (event) => {
  Rpc.emit('bus', event);
});

export const rpc = {
  async fetch(input: { url: string; method: string; headers: Record<string, string>; body?: string | undefined }) {
    const request = new Request(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body ?? null,
    });
    const response = await app().fetch(request);
    const body = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  },

  async server(input: { port: number; hostname: string }) {
    const server = Bun.serve({
      port: input.port,
      hostname: input.hostname,
      fetch: app().fetch,
    });
    return { url: server.url.toString() };
  },

  async shutdown() {
    // Reason: no persistent resources to clean up yet — keyring is per-call
  },
};

Rpc.listen(rpc);
