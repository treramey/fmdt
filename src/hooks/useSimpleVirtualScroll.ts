import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Viewport height constants
const MIN_VIEWPORT_HEIGHT = 5;
const MAX_VIEWPORT_HEIGHT = 20;
const DEFAULT_TERMINAL_ROWS = 24;

type UseSimpleVirtualScrollOptions<T> = {
  items: T[];
  selectedIndex: number;
  reservedLines: number;
  testViewportHeight?: number;
};

type UseSimpleVirtualScrollReturn<T> = {
  scrollOffset: number;
  viewportHeight: number;
  viewStart: number;
  viewEnd: number;
  visibleItems: T[];
  hasTopIndicator: boolean;
  hasBottomIndicator: boolean;
  totalLines: number;
};

/**
 * A simplified virtual scroll hook for flat lists (non-hierarchical)
 * Automatically scrolls to keep the selected item in view
 */
export function useSimpleVirtualScroll<T>({
  items,
  selectedIndex,
  reservedLines,
  testViewportHeight,
}: UseSimpleVirtualScrollOptions<T>): UseSimpleVirtualScrollReturn<T> {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  const viewportHeight = useMemo(() => {
    if (testViewportHeight !== undefined) {
      return testViewportHeight;
    }

    const calculatedHeight = Math.max(MIN_VIEWPORT_HEIGHT, (stdout?.rows ?? DEFAULT_TERMINAL_ROWS) - reservedLines);
    return Math.min(calculatedHeight, MAX_VIEWPORT_HEIGHT);
  }, [stdout?.rows, reservedLines, testViewportHeight]);

  const totalLines = items.length;

  const getAdjustedScrollOffset = useCallback(
    (currentScrollOffset: number): number => {
      const maxScroll = Math.max(0, totalLines - viewportHeight);

      // If selected item is above viewport, scroll up
      if (selectedIndex < currentScrollOffset) {
        return Math.max(0, selectedIndex);
      }
      // If selected item is below viewport, scroll down
      if (selectedIndex >= currentScrollOffset + viewportHeight) {
        return Math.min(maxScroll, selectedIndex - viewportHeight + 1);
      }
      return currentScrollOffset;
    },
    [viewportHeight, selectedIndex, totalLines],
  );

  // Auto-scroll to keep selected item in view
  useEffect(() => {
    setScrollOffset((currentScrollOffset) => {
      const adjustedOffset = getAdjustedScrollOffset(currentScrollOffset);
      return adjustedOffset;
    });
  }, [getAdjustedScrollOffset]);

  const { viewStart, viewEnd } = useMemo(() => {
    const clampedOffset = Math.max(0, Math.min(scrollOffset, totalLines - viewportHeight));
    const start = clampedOffset;
    const end = Math.min(start + viewportHeight, totalLines);
    return { viewStart: start, viewEnd: end };
  }, [scrollOffset, viewportHeight, totalLines]);

  const visibleItems = useMemo(() => items.slice(viewStart, viewEnd), [items, viewStart, viewEnd]);

  const hasTopIndicator = scrollOffset > 0;
  const hasBottomIndicator = scrollOffset + viewportHeight < totalLines;

  return {
    scrollOffset,
    viewportHeight,
    viewStart,
    viewEnd,
    visibleItems,
    hasTopIndicator,
    hasBottomIndicator,
    totalLines,
  };
}
