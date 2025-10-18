import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, test } from 'vitest';
import { useSimpleVirtualScroll } from '../src/hooks/useSimpleVirtualScroll.js';

// Test component for testing the hook
function TestComponent<T>({
  items,
  selectedIndex,
  reservedLines,
  testViewportHeight,
  onResult,
}: {
  items: T[];
  selectedIndex: number;
  reservedLines: number;
  testViewportHeight?: number;
  onResult?: (result: ReturnType<typeof useSimpleVirtualScroll<T>>) => void;
}) {
  const result = useSimpleVirtualScroll({
    items,
    selectedIndex,
    reservedLines,
    ...(testViewportHeight !== undefined && { testViewportHeight }),
  });

  React.useEffect(() => {
    if (onResult) {
      onResult(result);
    }
  }, [result, onResult]);

  return <Text>ViewportHeight: {result.viewportHeight}</Text>;
}

describe('useSimpleVirtualScroll', () => {
  test('should return correct visible items based on scroll offset', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    let hookResult: ReturnType<typeof useSimpleVirtualScroll<(typeof items)[0]>> | undefined;

    render(
      <TestComponent
        items={items}
        selectedIndex={0}
        reservedLines={5}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    expect(hookResult?.visibleItems.length).toBeLessThanOrEqual(hookResult?.viewportHeight ?? 0);
    expect(hookResult?.viewStart).toBe(0);
    expect(hookResult?.viewEnd).toBe(Math.min(items.length, hookResult?.viewportHeight ?? 0));
  });

  test('should handle edge case with empty items', () => {
    type Item = { id: number; name: string };
    let hookResult: ReturnType<typeof useSimpleVirtualScroll<Item>> | undefined;

    render(
      <TestComponent
        items={[]}
        selectedIndex={0}
        reservedLines={5}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    expect(hookResult?.totalLines).toBe(0);
    expect(hookResult?.visibleItems).toHaveLength(0);
    expect(hookResult?.hasTopIndicator).toBe(false);
    expect(hookResult?.hasBottomIndicator).toBe(false);
  });

  test('should handle edge case with small number of items', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    let hookResult: ReturnType<typeof useSimpleVirtualScroll<(typeof items)[0]>> | undefined;

    render(
      <TestComponent
        items={items}
        selectedIndex={0}
        reservedLines={5}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    expect(hookResult?.totalLines).toBe(3);
    expect(hookResult?.visibleItems).toHaveLength(3);
    expect(hookResult?.hasTopIndicator).toBe(false);
    expect(hookResult?.hasBottomIndicator).toBe(false);
  });

  test('should respect test viewport height parameter', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    let hookResult: ReturnType<typeof useSimpleVirtualScroll<(typeof items)[0]>> | undefined;

    render(
      <TestComponent
        items={items}
        selectedIndex={0}
        reservedLines={5}
        testViewportHeight={100}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    expect(hookResult?.viewportHeight).toBe(100);
  });

  test('should scroll to keep selected item in view', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    let hookResult: ReturnType<typeof useSimpleVirtualScroll<(typeof items)[0]>> | undefined;

    const { rerender } = render(
      <TestComponent
        items={items}
        selectedIndex={15}
        reservedLines={5}
        testViewportHeight={10}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    // Trigger another render to allow effects to settle
    rerender(
      <TestComponent
        items={items}
        selectedIndex={15}
        reservedLines={5}
        testViewportHeight={10}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    // Selected index 15 should be visible in viewport
    expect(hookResult?.viewStart).toBeLessThanOrEqual(15);
    expect(hookResult?.viewEnd).toBeGreaterThan(15);
  });

  test('should show scroll indicators correctly', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    let hookResult: ReturnType<typeof useSimpleVirtualScroll<(typeof items)[0]>> | undefined;

    const { rerender } = render(
      <TestComponent
        items={items}
        selectedIndex={15}
        reservedLines={5}
        testViewportHeight={10}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    // Trigger another render to allow effects to settle
    rerender(
      <TestComponent
        items={items}
        selectedIndex={15}
        reservedLines={5}
        testViewportHeight={10}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    // With 30 items, viewport of 10, and selection at 15, both indicators should show
    expect(hookResult?.hasTopIndicator).toBe(true);
    expect(hookResult?.hasBottomIndicator).toBe(true);
  });
});
