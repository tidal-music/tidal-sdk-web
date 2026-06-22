import { READ_TIMEOUT_MS, fetchWithRetry } from './retry.js';

/** Retry policy with zero delays so behavioural tests run instantly. */
const instant = {
  baseDelayMs: 0,
  maxDelayMs: 0,
} as const;

const defaultRetryOptions = {
  network: instant,
  status: instant,
  timeout: instant,
};

function ok(): Response {
  return new Response(JSON.stringify({ data: [] }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}

function status(code: number): Response {
  return new Response('', { status: code });
}

function get(url = 'https://example.test/albums'): Request {
  return new Request(url, { method: 'GET' });
}

describe('fetchWithRetry', () => {
  it('passes a successful response straight through without retrying', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValue(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 then succeeds', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('retries a 429 then succeeds', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(status(429))
      .mockResolvedValueOnce(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable status (404)', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValue(status(404));
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(404);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries and returns the final error response', async () => {
    // mockImplementation (not mockResolvedValue) so each attempt gets a fresh
    // Response — the retry layer drains the body of each one.
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockImplementation(() => Promise.resolve(status(503)));
    const fetcher = fetchWithRetry(
      { ...defaultRetryOptions, status: { ...instant, maxRetries: 2 } },
      base,
    );

    const response = await fetcher(get());

    expect(response.status).toBe(503);
    // 1 initial attempt + 2 retries.
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('retries network errors then succeeds', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxRetries on persistent network errors and rethrows', async () => {
    const error = new TypeError('Failed to fetch');
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockRejectedValue(error);
    const fetcher = fetchWithRetry(
      { ...defaultRetryOptions, network: { ...instant, maxRetries: 2 } },
      base,
    );

    await expect(fetcher(get())).rejects.toBe(error);
    // 1 initial attempt + 2 retries.
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('uses the network-error budget (10) which differs from the status budget (3)', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    // 4 network failures exceed the 3-retry status budget but stay within the
    // 10-retry network budget.
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(5);
  });

  it('retries a read timeout then succeeds', async () => {
    vi.useFakeTimers();
    try {
      const base = vi
        .fn<(input: Request) => Promise<Response>>()
        .mockImplementationOnce(
          (input: Request) =>
            new Promise<Response>((_resolve, reject) => {
              // Simulate a slow server: only settle when our read timeout aborts.
              input.signal.addEventListener('abort', () => {
                reject(new DOMException('aborted', 'AbortError'));
              });
            }),
        )
        .mockResolvedValueOnce(ok());
      const fetcher = fetchWithRetry(defaultRetryOptions, base);

      const pending = fetcher(get());
      expect(base).toHaveBeenCalledTimes(1);

      // Fire the per-attempt read timeout; the instant backoff then lets the
      // second attempt run and succeed.
      await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 1);

      const response = await pending;
      expect(response.status).toBe(200);
      expect(base).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry non-idempotent methods (POST)', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValue(status(503));
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(
      new Request('https://example.test/albums', { method: 'POST' }),
    );

    expect(response.status).toBe(503);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('propagates caller cancellation without retrying', async () => {
    const controller = new AbortController();
    const base = vi.fn<(input: Request) => Promise<Response>>(
      (input: Request) =>
        new Promise<Response>((_resolve, reject) => {
          input.signal.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const pending = fetcher(
      new Request('https://example.test/albums', {
        method: 'GET',
        signal: controller.signal,
      }),
    );
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(DOMException);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('passes requests straight through when disabled', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValue(status(503));
    const fetcher = fetchWithRetry({ enabled: false }, base);

    const response = await fetcher(get());

    expect(response.status).toBe(503);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('does not call fetch when the signal is already aborted', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValue(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    await expect(
      fetcher(
        new Request('https://example.test/albums', {
          method: 'GET',
          signal: AbortSignal.abort(),
        }),
      ),
    ).rejects.toBeInstanceOf(DOMException);
    expect(base).not.toHaveBeenCalled();
  });

  it('stops retrying when the caller aborts during backoff', async () => {
    const controller = new AbortController();
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockImplementationOnce(() => {
        // Abort during the first attempt so the signal is set before the sleep.
        controller.abort();
        return Promise.resolve(status(503));
      })
      .mockResolvedValue(ok());
    const fetcher = fetchWithRetry(
      {
        ...defaultRetryOptions,
        status: { baseDelayMs: 1_000, maxDelayMs: 1_000 },
      },
      base,
    );

    await expect(
      fetcher(
        new Request('https://example.test/albums', {
          method: 'GET',
          signal: controller.signal,
        }),
      ),
    ).rejects.toBeInstanceOf(DOMException);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('retries a 500 (lower 5xx boundary) then succeeds', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(status(500))
      .mockResolvedValueOnce(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('retries a 599 (upper 5xx boundary) then succeeds', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(status(599))
      .mockResolvedValueOnce(ok());
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(get());

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('retries idempotent HEAD requests', async () => {
    const base = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const fetcher = fetchWithRetry(defaultRetryOptions, base);

    const response = await fetcher(
      new Request('https://example.test/albums', { method: 'HEAD' }),
    );

    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('gives up after the timeout budget and rethrows', async () => {
    vi.useFakeTimers();
    try {
      const base = vi.fn<(input: Request) => Promise<Response>>(
        (input: Request) =>
          new Promise<Response>((_resolve, reject) => {
            input.signal.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      );
      const fetcher = fetchWithRetry(
        { ...defaultRetryOptions, timeout: { ...instant, maxRetries: 2 } },
        base,
      );

      // Capture the rejection as a value so it is handled before we advance.
      const settled = fetcher(get()).then(
        () => undefined,
        (error: unknown) => error,
      );

      // Drain every pending timer (the per-attempt read timeouts and the
      // instant backoffs between them) until the retry budget is exhausted.
      // 1 initial attempt + 2 retries.
      await vi.runAllTimersAsync();

      expect(await settled).toBeInstanceOf(DOMException);
      expect(base).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('backoff timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('waits B * 2 ** n * j before each retry (jitter at its 0.8 floor)', async () => {
      // Math.random() -> 0 yields the minimum jitter factor of 0.8.
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const base = vi
        .fn<(input: Request) => Promise<Response>>()
        .mockResolvedValueOnce(status(503))
        .mockResolvedValueOnce(status(503))
        .mockResolvedValueOnce(ok());
      const fetcher = fetchWithRetry(
        {
          ...defaultRetryOptions,
          status: { baseDelayMs: 1_000, maxDelayMs: 16_000, maxRetries: 3 },
        },
        base,
      );

      const pending = fetcher(get());

      expect(base).toHaveBeenCalledTimes(1);

      // First retry: 1000 * 2 ** 0 * 0.8 = 800ms.
      await vi.advanceTimersByTimeAsync(799);
      expect(base).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(base).toHaveBeenCalledTimes(2);

      // Second retry: 1000 * 2 ** 1 * 0.8 = 1600ms.
      await vi.advanceTimersByTimeAsync(1_599);
      expect(base).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(base).toHaveBeenCalledTimes(3);

      const response = await pending;
      expect(response.status).toBe(200);
    });

    it('clamps the delay to maxDelayMs', async () => {
      // Math.random() -> ~1 yields the maximum jitter factor of ~1.0.
      vi.spyOn(Math, 'random').mockReturnValue(0.999_999);
      const base = vi
        .fn<(input: Request) => Promise<Response>>()
        .mockResolvedValueOnce(status(503))
        .mockResolvedValueOnce(ok());
      const fetcher = fetchWithRetry(
        {
          ...defaultRetryOptions,
          status: {
            baseDelayMs: 1_000_000,
            maxDelayMs: 16_000,
            maxRetries: 3,
          },
        },
        base,
      );

      const pending = fetcher(get());

      await vi.advanceTimersByTimeAsync(15_999);
      expect(base).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(base).toHaveBeenCalledTimes(2);

      const response = await pending;
      expect(response.status).toBe(200);
    });
  });
});
