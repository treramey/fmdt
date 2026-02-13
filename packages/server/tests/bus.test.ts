import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';
import { BusEvent } from '../src/bus/bus-event.ts';
import { Bus } from '../src/bus/index.ts';

afterEach(() => {
  Bus._reset();
});

const TestEvent = BusEvent.define('test.happened', z.object({ value: z.number() }));

describe('Bus', () => {
  it('delivers events to subscribers', async () => {
    const handler = vi.fn();
    Bus.subscribe(TestEvent, handler);

    await Bus.publish(TestEvent, { value: 42 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ type: 'test.happened', properties: { value: 42 } });
  });

  it('supports multiple subscribers', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    Bus.subscribe(TestEvent, h1);
    Bus.subscribe(TestEvent, h2);

    await Bus.publish(TestEvent, { value: 1 });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('unsubscribe stops delivery', async () => {
    const handler = vi.fn();
    const unsub = Bus.subscribe(TestEvent, handler);
    unsub();

    await Bus.publish(TestEvent, { value: 0 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('subscribeAll receives all event types', async () => {
    const OtherEvent = BusEvent.define('other.event', z.object({ msg: z.string() }));
    const handler = vi.fn();
    Bus.subscribeAll(handler);

    await Bus.publish(TestEvent, { value: 1 });
    await Bus.publish(OtherEvent, { msg: 'hello' });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ type: 'test.happened', properties: { value: 1 } });
    expect(handler).toHaveBeenCalledWith({ type: 'other.event', properties: { msg: 'hello' } });
  });

  it('wildcard unsubscribe works', async () => {
    const handler = vi.fn();
    const unsub = Bus.subscribeAll(handler);
    unsub();

    await Bus.publish(TestEvent, { value: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('publish with no subscribers does not throw', async () => {
    await expect(Bus.publish(TestEvent, { value: 1 })).resolves.toBeUndefined();
  });
});
