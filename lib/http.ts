/**
 * Thin fetch wrapper: typed errors, a request timeout, and cooperation with an
 * externally supplied AbortSignal (which is how TanStack Query cancels work
 * when a screen unmounts or a query key changes).
 */

export class HttpError extends Error {
  readonly name = 'HttpError';

  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly url: string,
    readonly body?: string
  ) {
    super(`HTTP ${status} ${statusText} — ${url}`);
  }

  /**
   * 4xx responses are the caller's fault and will fail identically on retry.
   * Used by the query client's retry predicate.
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export class TimeoutError extends Error {
  readonly name = 'TimeoutError';

  constructor(
    readonly url: string,
    readonly timeoutMs: number
  ) {
    super(`Request timed out after ${timeoutMs}ms — ${url}`);
  }
}

const DEFAULT_TIMEOUT_MS = 12_000;

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function requestJson<T>(
  url: string,
  { method = 'GET', headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();

  // React Native's AbortController does not reliably carry an abort `reason`,
  // so the timeout is tracked with a flag rather than read back off the signal.
  let timedOut = false;

  const abortFromCaller = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromCaller);
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => undefined);
      throw new HttpError(response.status, response.statusText, url, body);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (timedOut) throw new TimeoutError(url, timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
