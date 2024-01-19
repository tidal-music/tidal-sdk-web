import { exponentialBackoff } from './fetchHandling';

describe('fetchHandling', () => {
  describe('exponentialBackoff', () => {
    it('retries a request if it errors in a certain way', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('', { status: 401 }));

      const response = await exponentialBackoff({
        delayInMs: 1,
        request: () => globalThis.fetch('https://login.tidal.com'),
        retry: (res: Response) => res.status > 400,
      });

      expect(fetchSpy).toBeCalledTimes(6);
      expect(response?.ok).toEqual(false);
    });
  });
});
