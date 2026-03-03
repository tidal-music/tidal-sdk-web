import { expect } from 'chai';

import { withRetries } from './retry';

describe('withRetries', () => {
  const FAST = { baseDelayMs: 1, maxRetries: 3 };

  it('returns on first successful attempt without retrying', async () => {
    let callCount = 0;

    const result = await withRetries(
      async () => {
        callCount++;
        return 'ok';
      },
      { ...FAST, shouldRetry: () => false },
    );

    expect(result).to.equal('ok');
    expect(callCount).to.equal(1);
  });

  it('retries thrown errors up to maxRetries then throws', async () => {
    let callCount = 0;

    try {
      await withRetries(
        async () => {
          callCount++;
          throw new Error('network failure');
        },
        { ...FAST, shouldRetry: () => false },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as Error).message).to.equal('network failure');
    }

    expect(callCount).to.equal(4); // 1 initial + 3 retries
  });

  it('retries when shouldRetry returns true, then returns last result', async () => {
    let callCount = 0;

    const result = await withRetries(
      async () => {
        callCount++;
        return { status: 500 };
      },
      {
        ...FAST,
        shouldRetry: res => res.status === 500,
      },
    );

    // After exhausting retries, the last result is returned (not thrown)
    expect(result).to.deep.equal({ status: 500 });
    expect(callCount).to.equal(4); // 1 initial + 3 retries
  });

  it('does not retry when shouldRetry returns false', async () => {
    let callCount = 0;

    const result = await withRetries(
      async () => {
        callCount++;
        return { status: 403 };
      },
      {
        ...FAST,
        shouldRetry: res => res.status >= 500,
      },
    );

    expect(result).to.deep.equal({ status: 403 });
    expect(callCount).to.equal(1);
  });

  it('recovers when operation succeeds after transient failures', async () => {
    let callCount = 0;

    const result = await withRetries(
      async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('transient');
        }
        return 'recovered';
      },
      { ...FAST, shouldRetry: () => false },
    );

    expect(result).to.equal('recovered');
    expect(callCount).to.equal(3);
  });

  it('recovers when shouldRetry stops being true', async () => {
    let callCount = 0;

    const result = await withRetries(
      async () => {
        callCount++;
        if (callCount <= 2) {
          return { body: 'error', status: 500 };
        }
        return { body: 'success', status: 200 };
      },
      {
        ...FAST,
        shouldRetry: res => res.status >= 500,
      },
    );

    expect(result).to.deep.equal({ body: 'success', status: 200 });
    expect(callCount).to.equal(3);
  });

  it('respects maxRetries = 0 (no retries)', async () => {
    let callCount = 0;

    try {
      await withRetries(
        async () => {
          callCount++;
          throw new Error('fail');
        },
        { baseDelayMs: 1, maxRetries: 0, shouldRetry: () => true },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as Error).message).to.equal('fail');
    }

    expect(callCount).to.equal(1);
  });

  it('applies exponential backoff delays', async () => {
    const timestamps: Array<number> = [];

    await withRetries(
      async () => {
        timestamps.push(performance.now());
        if (timestamps.length <= 3) {
          return { retry: true };
        }
        return { retry: false };
      },
      {
        baseDelayMs: 50,
        maxRetries: 3,
        shouldRetry: res => res.retry,
      },
    );

    expect(timestamps.length).to.equal(4);

    // Delays should be approximately 50ms, 100ms, 200ms
    // (with some tolerance for timer imprecision)
    const delays = timestamps.slice(1).map((t, i) => t - timestamps[i]!);

    expect(delays[0]).to.be.greaterThanOrEqual(40);
    expect(delays[1]).to.be.greaterThanOrEqual(80);
    expect(delays[2]).to.be.greaterThanOrEqual(160);
  });

  it('retries network errors then retryable status, mixing failure modes', async () => {
    let callCount = 0;

    const result = await withRetries(
      async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('network error');
        }
        if (callCount === 2) {
          return { error: true, status: 502 };
        }
        return { error: false, status: 200 };
      },
      {
        ...FAST,
        shouldRetry: res => res.error && res.status >= 500,
      },
    );

    expect(result).to.deep.equal({ error: false, status: 200 });
    expect(callCount).to.equal(3);
  });
});
