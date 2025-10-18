import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { match, P } from 'ts-pattern';
import type { FlatItem } from '../types/index.js';

// Viewport height constants
const MIN_VIEWPORT_HEIGHT = 5;
const MAX_VIEWPORT_HEIGHT = 20;
const DEFAULT_TERMINAL_ROWS = 24;

type UseVirtualScrollOptions = {
  items: FlatItem[];
  currentGroupIndex: number;
  currentFileIndex: number;
  isGroupSelected: boolean;
  reservedLines: number;
  testViewportHeight?: number;
};

type UseVirtualScrollReturn = {
  scrollOffset: number;
  viewportHeight: number;
  viewStart: number;
  viewEnd: number;
  visibleItems: FlatItem[];
  hasTopIndicator: boolean;
  hasBottomIndicator: boolean;
  totalLines: number;
  getAdjustedScrollOffset: (currentScrollOffset: number) => number;
};

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
