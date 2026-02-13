import { startTui } from '@fmdt/tui';
import { runHeadlessBranchReport } from './headless.ts';
import { Rpc } from './rpc.ts';
import type { rpc } from './worker.ts';

type RpcClient = ReturnType<typeof Rpc.client<typeof rpc>>;

function createWorkerFetch(client: RpcClient): typeof fetch {
  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const body = request.body ? await request.text() : undefined;
    const result = await client.call('fetch', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    });
    return new Response(result.body as BodyInit, {
      status: result.status as number,
      headers: result.headers as HeadersInit,
    });
  };
  return fn as typeof fetch;
}

export interface BootArgs {
  branch?: string | undefined;
  project?: string | undefined;
  configure?: boolean | undefined;
}

export async function boot(args: BootArgs): Promise<void> {
  const workerPath = new URL('./worker.ts', import.meta.url);
  const worker = new Worker(workerPath);

  worker.onerror = (e) => {
    console.error('Worker error:', e);
  };

  const client = Rpc.client<typeof rpc>(worker);

  // Reason: direct RPC mode (no HTTP server) — like opencode default
  const url = 'http://fmdt.internal';
  const customFetch = createWorkerFetch(client);

  const shutdown = async () => {
    await client.call('shutdown', undefined);
    worker.terminate();
  };

  process.on('SIGINT', () => {
    shutdown().then(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    shutdown().then(() => process.exit(0));
  });

  // Reason: Non-interactive mode — run report headlessly and exit
  if (args.branch) {
    try {
      await runHeadlessBranchReport({ fetchFn: customFetch, baseUrl: url }, args.branch, args.project);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      await shutdown();
      process.exit(1);
    }
    await shutdown();
    process.exit(0);
  }

  // Reason: Bridge worker bus events to TUI via Rpc event system
  const onBusEvent = (handler: (event: unknown) => void): (() => void) => {
    return client.on('bus', handler);
  };

  await startTui({
    url,
    fetch: customFetch,
    configure: args.configure,
    project: args.project,
    onBusEvent,
    onExit: shutdown,
  });

  process.exit(0);
}
