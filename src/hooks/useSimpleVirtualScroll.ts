import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Viewport height constants
const MIN_VIEWPORT_HEIGHT = 5;
const MAX_VIEWPORT_HEIGHT = 20;
const DEFAULT_TERMINAL_ROWS = 24;

/**
 * Options for the useSimpleVirtualScroll hook.
 */
type UseSimpleVirtualScrollOptions<T> = {
  /** The complete list of items to virtualize */
  items: T[];
  /** The currently selected item index */
  selectedIndex: number;
  /** Number of lines reserved for UI elements (header, footer, etc.) */
  reservedLines: number;
  /** Optional fixed viewport height for testing */
  testViewportHeight?: number;
};

/**
 * Return value from the useSimpleVirtualScroll hook.
 */
type UseSimpleVirtualScrollReturn<T> = {
  /** Current scroll offset in number of items */
  scrollOffset: number;
  /** Height of the viewport in lines */
  viewportHeight: number;
  /** Index of the first visible item */
  viewStart: number;
  /** Index of the last visible item (exclusive) */
  viewEnd: number;
  /** Array of items currently in the viewport */
  visibleItems: T[];
  /** Whether to show "↑ More above" indicator */
  hasTopIndicator: boolean;
  /** Whether to show "↓ More below" indicator */
  hasBottomIndicator: boolean;
  /** Total number of items in the list */
  totalLines: number;
};

/**
 * Virtual scrolling hook for flat, non-hierarchical lists.
 *
 * Efficiently renders large lists by only displaying items within the terminal viewport.
 * Automatically scrolls to keep the selected item visible and provides scroll indicators.
 *
 * @template T - The type of items in the list
 * @param options - Configuration options for virtual scrolling
 * @returns Scroll state and visible items for rendering
 * @example
 * const { visibleItems, hasTopIndicator, hasBottomIndicator } = useSimpleVirtualScroll({
 *   items: allProjects,
 *   selectedIndex: currentIndex,
 *   reservedLines: 6, // Header + footer lines
 * });
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
