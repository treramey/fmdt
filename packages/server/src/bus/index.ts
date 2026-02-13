import type { z } from 'zod/v4';
import type { BusEvent } from './bus-event.ts';

type Subscription = (event: unknown) => void | Promise<void>;

const subscriptions = new Map<string, Subscription[]>();

export namespace Bus {
  export async function publish<D extends BusEvent.Definition>(
    def: D,
    properties: z.output<D['properties']>,
  ): Promise<void> {
    const payload = { type: def.type, properties };
    const pending: (void | Promise<void>)[] = [];
    for (const key of [def.type, '*']) {
      const subs = subscriptions.get(key);
      if (subs) {
        for (const sub of subs) {
          pending.push(sub(payload));
        }
      }
    }
    await Promise.all(pending);
  }

  export function subscribe<D extends BusEvent.Definition>(
    def: D,
    callback: (event: { type: D['type']; properties: z.infer<D['properties']> }) => void | Promise<void>,
  ): () => void {
    return raw(def.type, callback as Subscription);
  }

  export function subscribeAll(callback: (event: unknown) => void | Promise<void>): () => void {
    return raw('*', callback);
  }

  function raw(type: string, callback: Subscription): () => void {
    const list = subscriptions.get(type) ?? [];
    list.push(callback);
    subscriptions.set(type, list);

    return () => {
      const current = subscriptions.get(type);
      if (!current) return;
      const idx = current.indexOf(callback);
      if (idx !== -1) current.splice(idx, 1);
    };
  }

  /** Clear all subscriptions (for testing). */
  export function _reset(): void {
    subscriptions.clear();
  }
}
