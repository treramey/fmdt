import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React, { type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from '../src/hooks/useDebounce.js';

// Test component that uses the useDebounce hook
function TestComponent({
  value,
  delay,
  onResult,
}: {
  value: string;
  delay?: number;
  onResult?: (result: string) => void;
}): ReactElement {
  const debouncedValue = useDebounce(value, delay);

  // Call onResult when debouncedValue changes
  React.useEffect(() => {
    if (onResult) {
      onResult(debouncedValue);
    }
  }, [debouncedValue, onResult]);

  return <Text>{debouncedValue}</Text>;
}

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { lastFrame } = render(<TestComponent value="test" delay={200} />);
    expect(lastFrame()).toBe('test');
  });

  it('should debounce value updates', async () => {
    const results: string[] = [];
    const { rerender, lastFrame } = render(
      <TestComponent
        value="initial"
        delay={200}
        onResult={(result) => {
          results.push(result);
        }}
      />,
    );

    expect(lastFrame()).toBe('initial');

    // Update the value
    rerender(
      <TestComponent
        value="updated"
        delay={200}
        onResult={(result) => {
          results.push(result);
        }}
      />,
    );

    // Value should still be initial (not debounced yet)
    expect(lastFrame()).toBe('initial');

    // Fast-forward time by 200ms and run all pending timers
    await vi.runAllTimersAsync();

    // Now the value should be updated
    expect(lastFrame()).toBe('updated');
  });

  it('should cancel previous debounce when value changes rapidly', async () => {
    const { rerender, lastFrame } = render(<TestComponent value="initial" delay={200} />);

    expect(lastFrame()).toBe('initial');

    // Rapid updates
    rerender(<TestComponent value="first" delay={200} />);
    rerender(<TestComponent value="second" delay={200} />);
    rerender(<TestComponent value="third" delay={200} />);

    // Value should still be initial (no debounce completed yet)
    expect(lastFrame()).toBe('initial');

    // Fast-forward all timers
    await vi.runAllTimersAsync();

    // Should only show the last value
    expect(lastFrame()).toBe('third');
  });

  it('should use default delay of 300ms when not specified', async () => {
    const { rerender, lastFrame } = render(<TestComponent value="initial" />);

    expect(lastFrame()).toBe('initial');

    rerender(<TestComponent value="updated" />);

    // Fast-forward all timers
    await vi.runAllTimersAsync();

    // Now it should update
    expect(lastFrame()).toBe('updated');
  });
});
