import { waitFor } from './wait-for';

/**
 * Wraps an async operation with retry logic using exponential backoff.
 *
 * Thrown exceptions (e.g. network failures) are always retried.
 * Non-throwing results are retried only when `shouldRetry` returns true,
 * allowing callers to retry on specific HTTP status codes without the
 * operation needing to throw.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: {
    baseDelayMs: number;
    maxRetries: number;
    shouldRetry: (result: T) => boolean;
  },
): Promise<T> {
  const { baseDelayMs, maxRetries, shouldRetry } = opts;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let result: T;

    try {
      result = await fn();
    } catch (e) {
      if (attempt < maxRetries) {
        await waitFor(baseDelayMs * Math.pow(2, attempt));
        continue;
      }
      throw e;
    }

    if (shouldRetry(result) && attempt < maxRetries) {
      await waitFor(baseDelayMs * Math.pow(2, attempt));
      continue;
    }

    return result;
  }

  // Unreachable — the loop always returns or throws on the last iteration.
  throw new Error('withRetries: unexpected fall-through');
}
