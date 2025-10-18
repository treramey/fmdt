import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, test } from 'vitest';
import { useVirtualScroll } from '../src/hooks/useVirtualScroll.js';
import type { FlatItem } from '../src/types/index.js';

const createMockItems = (count: number): FlatItem[] => {
  const items: FlatItem[] = [];
  const groupCount = Math.ceil(count / 5);

  for (let g = 0; g < groupCount; g++) {
    items.push({
      type: 'group',
      groupIndex: g,
    });

    const filesInGroup = Math.min(5, count - g * 5 - 1);
    for (let f = 0; f < filesInGroup; f++) {
      items.push({
        type: 'file',
        groupIndex: g,
        fileIndex: f,
      });
    }
  }

  return items;
};

// Test component for testing the hook
function TestComponent({
  items,
  currentGroupIndex,
  currentFileIndex,
  isGroupSelected,
  reservedLines,
  testViewportHeight,
  onResult,
}: {
  items: FlatItem[];
  currentGroupIndex: number;
  currentFileIndex: number;
  isGroupSelected: boolean;
  reservedLines: number;
  testViewportHeight?: number;
  onResult?: (result: ReturnType<typeof useVirtualScroll>) => void;
}) {
  const result = useVirtualScroll({
    items,
    currentGroupIndex,
    currentFileIndex,
    isGroupSelected,
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

describe('useVirtualScroll', () => {
  test('should return correct visible items based on scroll offset', () => {
    const items = createMockItems(30);
    let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

    render(
      <TestComponent
        items={items}
        currentGroupIndex={0}
        currentFileIndex={0}
        isGroupSelected={false}
        reservedLines={5}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    expect(hookResult?.visibleItems.length).toBeLessThanOrEqual(hookResult?.viewportHeight ?? 0);
    expect(hookResult?.viewStart).toBe(0);
    // viewEnd should be the minimum of totalLines and viewportHeight
    expect(hookResult?.viewEnd).toBe(Math.min(items.length, hookResult?.viewportHeight ?? 0));
  });

  test('should handle edge case with empty items', () => {
    let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

    render(
      <TestComponent
        items={[]}
        currentGroupIndex={0}
        currentFileIndex={0}
        isGroupSelected={false}
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
    const items = createMockItems(3);
    let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

    render(
      <TestComponent
        items={items}
        currentGroupIndex={0}
        currentFileIndex={0}
        isGroupSelected={false}
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
    let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

    render(
      <TestComponent
        items={createMockItems(50)}
        currentGroupIndex={0}
        currentFileIndex={0}
        isGroupSelected={false}
        reservedLines={5}
        testViewportHeight={100}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    expect(hookResult?.viewportHeight).toBe(100);
  });

  test('should handle group selection correctly', () => {
    const items = createMockItems(30);
    let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

    render(
      <TestComponent
        items={items}
        currentGroupIndex={2}
        currentFileIndex={0}
        isGroupSelected={true}
        reservedLines={5}
        onResult={(result) => {
          hookResult = result;
        }}
      />,
    );

    // Should scroll to show the selected group
    const selectedGroupPosition = items.findIndex((item) => item.type === 'group' && item.groupIndex === 2);

    if (selectedGroupPosition >= (hookResult?.viewportHeight ?? 0)) {
      expect(hookResult?.scrollOffset).toBeGreaterThan(0);
    }
  });
});
