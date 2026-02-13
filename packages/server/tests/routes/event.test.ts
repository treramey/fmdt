import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScanComplete, ScanStarted } from '../../src/bus/events.ts';
import { Bus } from '../../src/bus/index.ts';

afterEach(() => {
  Bus._reset();
});

describe('event bus integration (SSE backing)', () => {
  // Reason: SSE streams via streamSSE + app.request() block indefinitely in
  // Node-based vitest. We verify the Bus→subscriber delivery which backs the
  // SSE endpoint. The actual SSE transport is a thin Hono wrapper.

  it('subscribeAll receives published events', async () => {
    const received: unknown[] = [];
    Bus.subscribeAll((event) => {
      received.push(event);
    });

    await Bus.publish(ScanStarted, { totalRepos: 10 });
    await Bus.publish(ScanComplete, { duration: 1234 });

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ type: 'scan.started', properties: { totalRepos: 10 } });
    expect(received[1]).toEqual({ type: 'scan.complete', properties: { duration: 1234 } });
  });

  it('unsubscribe stops event delivery', async () => {
    const handler = vi.fn();
    const unsub = Bus.subscribeAll(handler);
    unsub();

    await Bus.publish(ScanStarted, { totalRepos: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('typed subscribe only receives matching events', async () => {
    const handler = vi.fn();
    Bus.subscribe(ScanStarted, handler);

    await Bus.publish(ScanComplete, { duration: 100 });
    expect(handler).not.toHaveBeenCalled();

    await Bus.publish(ScanStarted, { totalRepos: 3 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ type: 'scan.started', properties: { totalRepos: 3 } });
  });
});
