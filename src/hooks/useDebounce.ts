import { debounce } from 'es-toolkit/function';
import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook that debounces a value.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 200);
 *
 * useEffect(() => {
 *   // This will only run after searchTerm has stopped changing for 200ms
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const debouncedSetterRef = useRef(
    debounce((newValue: T) => {
      setDebouncedValue(newValue);
    }, delay),
  );

  useEffect(() => {
    // Update the debounced setter if delay changes
    debouncedSetterRef.current = debounce((newValue: T) => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    debouncedSetterRef.current(value);

    // Cleanup: cancel any pending debounced calls when unmounting
    return () => {
      debouncedSetterRef.current.cancel();
    };
  }, [value]);

  return debouncedValue;
}
