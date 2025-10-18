import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { match, P } from 'ts-pattern';
import type { FlatItem } from '../types/index.js';

// Viewport height constants
const MIN_VIEWPORT_HEIGHT = 5;
const MAX_VIEWPORT_HEIGHT = 20;
const DEFAULT_TERMINAL_ROWS = 24;

/**
 * Options for the useVirtualScroll hook.
 */
type UseVirtualScrollOptions = {
  /** Flattened array of group and file items */
  items: FlatItem[];
  /** Index of the currently selected group */
  currentGroupIndex: number;
  /** Index of the currently selected file within its group */
  currentFileIndex: number;
  /** Whether a group header is selected (vs a file) */
  isGroupSelected: boolean;
  /** Number of lines reserved for UI elements */
  reservedLines: number;
  /** Optional fixed viewport height for testing */
  testViewportHeight?: number;
};

/**
 * Return value from the useVirtualScroll hook.
 */
type UseVirtualScrollReturn = {
  /** Current scroll offset in number of items */
  scrollOffset: number;
  /** Height of the viewport in lines */
  viewportHeight: number;
  /** Index of the first visible item */
  viewStart: number;
  /** Index of the last visible item (exclusive) */
  viewEnd: number;
  /** Array of items currently in the viewport */
  visibleItems: FlatItem[];
  /** Whether to show "↑ More above" indicator */
  hasTopIndicator: boolean;
  /** Whether to show "↓ More below" indicator */
  hasBottomIndicator: boolean;
  /** Total number of items in the list */
  totalLines: number;
  /** Function to calculate adjusted scroll offset based on selection */
  getAdjustedScrollOffset: (currentScrollOffset: number) => number;
};

/**
 * Virtual scrolling hook for hierarchical lists with groups and files.
 *
 * Handles more complex scenarios than useSimpleVirtualScroll, supporting nested
 * items like file groups. Tracks both group and file selection states to properly
 * position the viewport.
 *
 * @param options - Configuration options including hierarchical selection state
 * @returns Scroll state and visible items for rendering grouped lists
 * @example
 * const { visibleItems, hasTopIndicator } = useVirtualScroll({
 *   items: flattenedItems,
 *   currentGroupIndex: 0,
 *   currentFileIndex: 2,
 *   isGroupSelected: false,
 *   reservedLines: 8,
 * });
 */
export function useVirtualScroll({
  items,
  currentGroupIndex,
  currentFileIndex,
  isGroupSelected,
  reservedLines,
  testViewportHeight,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
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

  const { viewStart, viewEnd } = useMemo(() => {
    const clampedOffset = Math.max(0, Math.min(scrollOffset, totalLines - viewportHeight));
    const start = clampedOffset;
    const end = Math.min(start + viewportHeight, totalLines);
    return { viewStart: start, viewEnd: end };
  }, [scrollOffset, viewportHeight, totalLines]);

  const visibleItems = useMemo(() => items.slice(viewStart, viewEnd), [items, viewStart, viewEnd]);

  const getCurrentLinePosition = useCallback((): number => {
    let position = 0;

    for (const item of items) {
      const found = match(item)
        .with(
          {
            type: 'group',
            groupIndex: P.when((idx) => isGroupSelected && idx === currentGroupIndex),
          },
          () => true,
        )
        .with(
          {
            type: 'file',
            groupIndex: P.when((gIdx) => !isGroupSelected && gIdx === currentGroupIndex),
            fileIndex: P.when((fIdx) => fIdx === currentFileIndex),
          },
          () => true,
        )
        .otherwise(() => false);

      if (found) return position;
      position++;
    }

    return 0;
  }, [items, currentGroupIndex, currentFileIndex, isGroupSelected]);

  const getAdjustedScrollOffset = useCallback(
    (currentScrollOffset: number): number => {
      const currentLine = getCurrentLinePosition();
      const maxScroll = Math.max(0, totalLines - viewportHeight);

      if (currentLine < currentScrollOffset) {
        return Math.max(0, currentLine);
      }
      if (currentLine >= currentScrollOffset + viewportHeight) {
        return Math.min(maxScroll, currentLine - viewportHeight + 1);
      }
      return currentScrollOffset;
    },
    [viewportHeight, getCurrentLinePosition, totalLines],
  );

  useEffect(() => {
    setScrollOffset((currentScrollOffset) => {
      const adjustedOffset = getAdjustedScrollOffset(currentScrollOffset);
      return adjustedOffset;
    });
  }, [getAdjustedScrollOffset]);

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
    getAdjustedScrollOffset,
  };
}
