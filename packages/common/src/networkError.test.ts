import { NetworkError } from './networkError';
import { RetryableError } from './retryableError';
import { TidalError } from './tidalError';

describe('NetworkError', () => {
  it('is an instance of NetworkError', () => {
    try {
      throw new NetworkError('baz');
    } catch (e) {
      expect(e).toBeInstanceOf(NetworkError);
      expect(e).toBeInstanceOf(TidalError);
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(Object);
      expect(e).not.toBeInstanceOf(RetryableError);
      // @ts-expect-error as `e` is any, strange to `throw/catch` in a test, but tests the most realistic scenario
      expect(e.name).toBe('NetworkError');
      // @ts-expect-error TS(18046)
      expect(e.errorCode).toBe('baz');
    }
  });
});
