/* eslint-disable no-restricted-syntax */

import { TrueTime } from '.';

const DAYS_30 = 2_592_000_000;
const MINUTES_18 = 1_080_000;

describe('TrueTime', () => {
  describe('tidal true time', () => {
    const trueTime = new TrueTime('https://api.tidal.com/v1/ping');

    afterEach(() => {
      vi.restoreAllMocks();
      vi.clearAllTimers();
    });

    describe('synchronize', () => {
      it('re-syncs time with server if it has not ben done for 1M ms', async () => {
        const _trueTime = new TrueTime('https://api.tidal.com/v1/ping');

        await _trueTime.synchronize();

        vi.useFakeTimers();
        vi.setSystemTime(new Date(Date.now() + MINUTES_18));

        const spy = vi.spyOn(_trueTime, 'setServerTime');

        await _trueTime.synchronize();

        expect(spy).toBeCalled();
      });
    });

    describe('driftDiff', () => {
      it('returns the drift diff', () => {
        const _trueTime = new TrueTime('https://api.tidal.com/v1/ping');
        const diff = _trueTime.driftDiff();

        expect(diff).toBeLessThan(1);
      });

      it('returns the current drift when performance.now() is out of sync', () => {
        const oldTrueTime = new TrueTime('https://api.tidal.com/v1/ping');

        vi.spyOn(oldTrueTime, 'timeOrigin').mockReturnValue(
          Date.now() - DAYS_30 - performance.now(),
        );

        // eslint-disable-next-line vitest/valid-expect
        expect(oldTrueTime.driftDiff()).to.be.closeTo(DAYS_30, 1000);
      });
    });

    describe('currentDrift', () => {
      it('returns the current drift when Date.now() is out of sync', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(Date.now() - DAYS_30));

        // eslint-disable-next-line vitest/valid-expect
        expect(trueTime.currentDrift()).to.be.closeTo(DAYS_30, 1000);
      });

      it('returns the current drift when performance.now() is out of sync', () => {
        const oldTrueTime = new TrueTime('https://api.tidal.com/v1/ping');

        vi.spyOn(oldTrueTime, 'timeOrigin').mockReturnValue(
          Date.now() - DAYS_30 - performance.now(),
        );

        // eslint-disable-next-line vitest/valid-expect
        expect(oldTrueTime.currentDrift()).to.be.closeTo(DAYS_30, 1000);
      });
    });

    describe('now', () => {
      it('returns a valid timestamp when client clock is many days behind', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(Date.now() - DAYS_30));

        await trueTime.synchronize();

        // eslint-disable-next-line vitest/valid-expect
        expect(trueTime.now()).to.be.closeTo(Date.now(), 1000);
      });

      it('returns a valid timestamp when performance timeOrigin is many days behind', async () => {
        vi.clearAllTimers();

        const oldTrueTime = new TrueTime('https://api.tidal.com/v1/ping');

        vi.spyOn(oldTrueTime, 'timeOrigin').mockReturnValue(
          Date.now() - DAYS_30 - performance.now(),
        );

        await oldTrueTime.setServerTime();

        // eslint-disable-next-line vitest/valid-expect
        expect(oldTrueTime.now()).to.be.closeTo(Date.now(), 1000);
      });
    });

    describe('timestamp', () => {
      beforeAll(async () => {
        await trueTime.synchronize();
      });

      test('returns adjusted time at mark', () => {
        performance.mark('before time travel');

        expect(trueTime.timestamp('before time travel')).toBeTypeOf('number');
      });

      test('return undefined for unmarked', () => {
        expect(trueTime.timestamp('fitnessgram pacer test')).not.toBeDefined();
      });

      test('returns adjusted time at mark for a scoped mark', () => {
        performance.mark('time-mark', { detail: 'getmjölk' });

        expect(trueTime.timestamp('time-mark', 'getmjölk')).toBeTypeOf(
          'number',
        );
      });

      test('throw error if an expected mark detail is missing', () => {
        performance.mark('time-mark', { detail: 'getmjölk' });

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

      const callArg = vi.mocked(fetch).mock.calls[0][0] as URL;
      expect(callArg.href).toEqual('https://time.google.com/');
    });
  });
});
