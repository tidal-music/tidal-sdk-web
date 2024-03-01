/* eslint-disable no-restricted-syntax */

import { TrueTime } from '.';

vi.useFakeTimers();

describe('TrueTime', () => {
  describe('tidal true time', () => {
    const trueTime = new TrueTime('https://api.tidal.com/v1/ping');

    beforeAll(async () => {
      await trueTime.synchronize();
    });

    describe('now', () => {
      it('returns the Date.now() value adjusted to server time', () => {
        const thirtyDays = 2_592_000_000;
        const currentTime = Date.now();

        vi.setSystemTime(new Date(Date.now() - thirtyDays));

        // Assert that TrueTime has adjusted
        expect(trueTime.now(currentTime)).not.toEqual(Date.now());

        const diff = Math.abs(trueTime.now(currentTime) - Date.now());

        // Check the diff and allow for 100 ms offset due to test timings.
        // Chai style assertion that works, but is unexpected:
        // eslint-disable-next-line vitest/valid-expect
        expect(diff).to.be.closeTo(thirtyDays, 1000);
      });
    });

    describe('timestamp', () => {
      test('returns adjusted time at mark', () => {
        performance.mark('before time travel', { startTime: trueTime.now() });

        expect(trueTime.timestamp('before time travel')).toBeTypeOf('number');
      });

      test('return undefined for unmarked', () => {
        expect(trueTime.timestamp('fitnessgram pacer test')).not.toBeDefined();
      });

      test('returns adjusted time at mark for a scoped mark', () => {
        performance.mark('time-mark', {
          detail: 'getmjölk',
          startTime: trueTime.now(),
        });

        expect(trueTime.timestamp('time-mark', 'getmjölk')).toBeTypeOf(
          'number',
        );
      });

      test('throw error if an expected mark detail is missing', () => {
        performance.mark('time-mark', {
          detail: 'getmjölk',
          startTime: trueTime.now(),
        });

        expect(() => trueTime.timestamp('time-mark', 'honung')).toThrowError(
          'There is no performance entry named "time-mark" with detail "honung"',
        );
      });
    });
  });

  describe('true time errors', () => {
    const trueTime = new TrueTime('https://api.tidal.com/v1/ping');

    describe('now', () => {
      test('throws error due to no synchronize call', async () => {
        expect(() => trueTime.now()).toThrowError(
          'Initialization has not been done yet. You need to call and await the synchronize method once.',
        );
      });
    });

    describe('timestamp', () => {
      test('throws error due to no synchronize call', async () => {
        // PS `performance.mark` should not be called without `startTime: trueTime.now()` option,
        // but doing it here to test the error.
        performance.mark('birds are dinosaurs');

        expect(() => trueTime.timestamp('birds are dinosaurs')).toThrowError(
          'Initialization has not been done yet. You need to call and await the synchronize method once.',
        );
      });
    });
  });

  describe('google true time', () => {
    const trueTime = new TrueTime('https://time.google.com');

    test('fetches server time from correct url', async () => {
      vi.spyOn(globalThis, 'fetch');
      await trueTime.synchronize();

      const callArg = vi.mocked(fetch)?.mock.calls[0]?.[0] as URL;
      expect(callArg?.href).toEqual('https://time.google.com/');
    });
  });
});
