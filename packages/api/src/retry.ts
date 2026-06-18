/**
 * HTTP retry mechanism for the TIDAL API client
 *
 * Idempotent requests (GET/HEAD/OPTIONS) are retried with exponential backoff
 * and jitter, using a separate retry budget per failure category. The delay
 * before a retry is
 *
 *   D = min(B * 2 ** n * j, M)
 *
 * where B is the base delay, n is the zero-based retry number, j is a random
 * jitter factor in [0.8, 1) and M is the maximum delay.
 *
 * Non-idempotent requests (POST/PATCH/PUT/DELETE) are passed through untouched —
 * a failed write must never be silently repeated, and the per-attempt read
 * timeout would otherwise risk aborting an in-flight mutation.
 */

/** A fetch implementation compatible with openapi-fetch's `fetch` option. */
type FetchLike = (input: Request) => Promise<Response>;

type RetryPolicy = {
  /** Base delay B in milliseconds. */
  baseDelayMs: number;
  /** Maximum delay M in milliseconds; the backoff is clamped to this. */
  maxDelayMs: number;
  /** Maximum number of retries N, in addition to the initial attempt. */
  maxRetries: number;
};

type RetryCategory = 'network' | 'status' | 'timeout';

type RetryPolicies = Record<RetryCategory, RetryPolicy>;

export type RetryOptions = Partial<
  Record<RetryCategory, Partial<RetryPolicy>>
> & {
  /** Set to `false` to disable retries and the read timeout entirely. */
  enabled?: boolean;
};

const DEFAULTS: RetryPolicies = {
  network: { baseDelayMs: 1_000, maxDelayMs: 16_000, maxRetries: 10 },
  status: { baseDelayMs: 500, maxDelayMs: 16_000, maxRetries: 3 },
  timeout: { baseDelayMs: 8_000, maxDelayMs: 32_000, maxRetries: 3 },
};

/** Per-attempt read timeout in milliseconds. */
export const READ_TIMEOUT_MS = 10_000;

/** Safe/idempotent methods that are eligible for retries. */
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const defaultFetch: FetchLike = input => globalThis.fetch(input);

/**
 * Wraps a fetch implementation with a retry mechanism. The returned function
 * matches openapi-fetch's `fetch` option signature, so it can be passed
 * straight to `createClient({ fetch })`.
 */
export function fetchWithRetry(
  options: RetryOptions = {},
  baseFetch: FetchLike = defaultFetch,
): FetchLike {
  if (options.enabled === false) {
    return baseFetch;
  }

  const policies = resolvePolicies(options);

  return async (input: Request): Promise<Response> => {
    if (!RETRYABLE_METHODS.has(input.method.toUpperCase())) {
      return baseFetch(input);
    }

    const retries = { network: 0, status: 0, timeout: 0 };

    while (true) {
      // Honour a caller cancellation that landed between attempts.
      if (input.signal.aborted) {
        throw toError(input.signal.reason);
      }

      const attempt = await runAttempt(baseFetch, input);

      if (attempt.kind === 'response') {
        if (!isRetryableStatus(attempt.response.status)) {
          return attempt.response;
        }
        if (retries.status >= policies.status.maxRetries) {
          return attempt.response;
        }
        await sleep(
          backoffDelay(policies.status, retries.status),
          input.signal,
        );
        retries.status += 1;
        continue;
      }

      const key = attempt.kind;

      if (retries[key] >= policies[key].maxRetries) {
        throw attempt.error;
      }
      await sleep(backoffDelay(policies[key], retries[key]), input.signal);
      retries[key] += 1;
    }
  };
}

function resolvePolicy(
  base: RetryPolicy,
  override?: Partial<RetryPolicy>,
): RetryPolicy {
  return {
    baseDelayMs: override?.baseDelayMs ?? base.baseDelayMs,
    maxDelayMs: override?.maxDelayMs ?? base.maxDelayMs,
    maxRetries: override?.maxRetries ?? base.maxRetries,
  };
}

function resolvePolicies(options: RetryOptions): RetryPolicies {
  return {
    network: resolvePolicy(DEFAULTS.network, options.network),
    status: resolvePolicy(DEFAULTS.status, options.status),
    timeout: resolvePolicy(DEFAULTS.timeout, options.timeout),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/** D = min(B * 2 ** n * j, M), with jitter j in [0.8, 1). */
function backoffDelay(policy: RetryPolicy, retry: number): number {
  const jitter = 0.8 + Math.random() * 0.2;
  return Math.min(policy.baseDelayMs * 2 ** retry * jitter, policy.maxDelayMs);
}

/** Coerce an abort reason (`AbortSignal.reason` is `any`) to a throwable Error. */
function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

/**
 * Wait `ms`, rejecting early if `signal` aborts so a caller who cancels during
 * the backoff is honoured immediately instead of after the full delay.
 */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(toError(signal.reason));
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const onAbort = () => {
      clearTimeout(timer);
      reject(toError(signal.reason));
    };
    timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

type Attempt =
  | { error: unknown; kind: 'network' }
  | { error: unknown; kind: 'timeout' }
  | { kind: 'response'; response: Response };

/**
 * Run a single fetch attempt with a per-attempt read timeout. A timeout is
 * reported separately from a network error so the caller can apply the
 * category-specific retry policy. A caller-initiated cancellation propagates
 * instead of being retried.
 */
async function runAttempt(
  baseFetch: FetchLike,
  request: Request,
): Promise<Attempt> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, READ_TIMEOUT_MS);

  const callerSignal = request.signal;
  const onCallerAbort = () => {
    controller.abort();
  };
  if (callerSignal.aborted) {
    controller.abort();
  } else {
    callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    const response = await baseFetch(
      new Request(request, { signal: controller.signal }),
    );
    // `fetch` resolves as soon as the response *headers* arrive — the body may
    // still be streaming in. openapi-fetch doesn't read that body until after
    // our fetch returns, by which point the `finally` below has cleared the
    // timeout. So a response with fast headers but a body that stalls mid-stream
    // would slip past the read timeout entirely and hang forever. Buffering the
    // body here keeps it inside the timeout window, so a stalled body trips the
    // timeout and gets retried like any other failure.
    return { kind: 'response', response: await bufferBody(response) };
  } catch (error) {
    // The caller cancelled — propagate rather than retry.
    if (callerSignal.aborted) {
      throw error;
    }
    return timedOut ? { error, kind: 'timeout' } : { error, kind: 'network' };
  } finally {
    clearTimeout(timer);
    callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * Read the response body fully into memory and return an equivalent response
 * backed by those bytes. The rebuilt response drops `Response.url`/`redirected`,
 * which this client does not rely on.
 */
async function bufferBody(response: Response): Promise<Response> {
  if (!response.body) {
    return response;
  }
  const body = await response.arrayBuffer();
  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}
