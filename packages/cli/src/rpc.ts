/** Worker ↔ Main thread RPC — ported from opencode's Rpc namespace. */

// Reason: Worker globals (onmessage, postMessage) are typed via @types/bun in worker context.
// The listen/emit functions are only called inside worker.ts.

interface RpcRequest {
  type: 'rpc.request';
  method: string;
  input: unknown;
  id: number;
}

interface RpcResult {
  type: 'rpc.result';
  result: unknown;
  id: number;
}

interface RpcError {
  type: 'rpc.error';
  error: string;
  id: number;
}

interface RpcEvent {
  type: 'rpc.event';
  event: string;
  data: unknown;
}

type RpcMessage = RpcRequest | RpcResult | RpcError | RpcEvent;
type Definition = Record<string, (input: never) => unknown>;

const workerSelf = globalThis as unknown as {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage(data: string): void;
};

export namespace Rpc {
  /** Worker side: listen for RPC calls and dispatch to handler functions. */
  export function listen(rpc: Definition): void {
    workerSelf.onmessage = async (evt: MessageEvent) => {
      const parsed = JSON.parse(String(evt.data)) as RpcMessage;
      if (parsed.type !== 'rpc.request') return;

      const method = parsed.method;
      const handler = rpc[method];
      if (!handler) {
        workerSelf.postMessage(
          JSON.stringify({ type: 'rpc.error', error: `Unknown method: ${method}`, id: parsed.id }),
        );
        return;
      }

      try {
        const result = await handler(parsed.input as never);
        workerSelf.postMessage(JSON.stringify({ type: 'rpc.result', result, id: parsed.id }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        workerSelf.postMessage(JSON.stringify({ type: 'rpc.error', error: message, id: parsed.id }));
      }
    };
  }

  /** Worker side: emit an event to the main thread. */
  export function emit(event: string, data: unknown): void {
    workerSelf.postMessage(JSON.stringify({ type: 'rpc.event', event, data }));
  }

  /** Main thread side: create an RPC client from a Worker. */
  export function client<T extends Definition>(target: Worker) {
    const pending = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void }>();
    const listeners = new Map<string, Set<(data: unknown) => void>>();
    let nextId = 0;

    target.onmessage = (evt: MessageEvent) => {
      const parsed = JSON.parse(String(evt.data)) as RpcMessage;

      if (parsed.type === 'rpc.result') {
        const p = pending.get(parsed.id);
        if (p) {
          p.resolve(parsed.result);
          pending.delete(parsed.id);
        }
      }

      if (parsed.type === 'rpc.error') {
        const p = pending.get(parsed.id);
        if (p) {
          p.reject(new Error(parsed.error));
          pending.delete(parsed.id);
        }
      }

      if (parsed.type === 'rpc.event') {
        const handlers = listeners.get(parsed.event);
        if (handlers) {
          for (const handler of handlers) {
            handler(parsed.data);
          }
        }
      }
    };

    return {
      call<Method extends keyof T & string>(
        method: Method,
        input: Parameters<T[Method]>[0],
      ): Promise<Awaited<ReturnType<T[Method]>>> {
        const id = nextId++;
        return new Promise((resolve, reject) => {
          pending.set(id, {
            resolve: resolve as (result: unknown) => void,
            reject,
          });
          target.postMessage(JSON.stringify({ type: 'rpc.request', method, input, id }));
        });
      },

      on(event: string, handler: (data: unknown) => void): () => void {
        let handlers = listeners.get(event);
        if (!handlers) {
          handlers = new Set();
          listeners.set(event, handlers);
        }
        handlers.add(handler);
        return () => {
          handlers.delete(handler);
        };
      },
    };
  }
}
