import { NetworkError } from './networkError';
import { TidalError } from './tidalError';

describe('TidalError', () => {
  it('is an instance of TidalError', () => {
    try {
      throw new TidalError('baz', { cause: 'bazMessage' });
    } catch (e) {
      expect(e).toBeInstanceOf(TidalError);
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(Object);
      expect(e).not.toBeInstanceOf(NetworkError);
      // @ts-expect-error as `e` is any, strange to `throw/catch` in a test, but tests the most realistic scenario
      expect(e.name).toBe('TidalError');
      // @ts-expect-error TS(18046)
      expect(e.errorCode).toBe('baz');
    }
  });
});
