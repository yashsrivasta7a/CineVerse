import { useEffect, useState } from 'react';

/**
 * Debounces a value.
 *
 * Feeding the debounced value into a query key (rather than debouncing the
 * *request*) is what fixes search: TanStack Query cancels the in-flight request
 * when the key changes, so a result for a query the user has already backspaced
 * past can no longer land and overwrite a newer one.
 */
export function useDebouncedValue<T>(value: T, delayMs = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
