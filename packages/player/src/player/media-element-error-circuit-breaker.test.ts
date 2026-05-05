import { expect } from 'chai';

import { createMediaElementErrorCircuitBreaker } from './media-element-error-circuit-breaker';

describe('createMediaElementErrorCircuitBreaker', () => {
  function setup({
    errorWindowMs = 60_000,
    maxErrors = 10,
  }: { errorWindowMs?: number; maxErrors?: number } = {}) {
    const logged: Array<Event> = [];
    let limitReachedCount = 0;
    let now = 0;

    const breaker = createMediaElementErrorCircuitBreaker({
      errorWindowMs,
      log: e => logged.push(e),
      maxErrors,
      now: () => now,
      onLimitReached: () => {
        limitReachedCount += 1;
      },
    });

    const fire = (n = 1) => {
      for (let i = 0; i < n; i++) {
        breaker.handleError(new Event('error'));
      }
    };

    return {
      advance: (ms: number) => {
        now += ms;
      },
      breaker,
      fire,
      get limitReachedCount() {
        return limitReachedCount;
      },
      get logged() {
        return logged;
      },
    };
  }

  it('logs every error up to and including maxErrors', () => {
    const t = setup({ maxErrors: 10 });

    t.fire(10);

    expect(t.logged.length).to.equal(10);
  });

  it('triggers onLimitReached exactly once at the maxErrors threshold', () => {
    const t = setup({ maxErrors: 10 });

    t.fire(9);
    expect(t.limitReachedCount).to.equal(0);

    t.fire(1);
    expect(t.limitReachedCount).to.equal(1);

    t.fire(50);
    expect(t.limitReachedCount).to.equal(1);
  });

  it('suppresses logging once the limit is exceeded', () => {
    const t = setup({ maxErrors: 10 });

    t.fire(1000);

    expect(t.logged.length).to.equal(10);
  });

  it('resets the counter when the rolling window elapses without errors', () => {
    const t = setup({ errorWindowMs: 60_000, maxErrors: 10 });

    t.fire(5);
    expect(t.logged.length).to.equal(5);

    t.advance(60_001);
    t.fire(5);

    expect(t.logged.length).to.equal(10);
    expect(t.limitReachedCount).to.equal(0);
  });

  it('does not reset within the rolling window', () => {
    const t = setup({ errorWindowMs: 60_000, maxErrors: 10 });

    t.fire(9);
    t.advance(59_000);
    t.fire(2);

    expect(t.logged.length).to.equal(10);
    expect(t.limitReachedCount).to.equal(1);
  });

  it('reset() clears the counter and re-arms the breaker', () => {
    const t = setup({ maxErrors: 10 });

    t.fire(1000);
    expect(t.limitReachedCount).to.equal(1);

    t.breaker.reset();

    t.fire(9);
    expect(t.limitReachedCount).to.equal(1);

    t.fire(1);
    expect(t.limitReachedCount).to.equal(2);
    expect(t.logged.length).to.equal(20);
  });
});
