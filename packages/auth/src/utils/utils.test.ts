import { webcrypto } from 'node:crypto';

import {
  base64URLEncode,
  generateOAuthCodeChallenge,
  setCryptoAdapter,
  sha256,
} from './utils';

describe('utils', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
  });

  describe('base64URLEncode', () => {
    it('generates the base64 (url encoded) version of a string', () => {
      const result = base64URLEncode('l+o/l==');
      expect(result).toEqual('l-o_l');
    });
  });

  describe('sha256', () => {
    it('generates a sha256 hash of the text', async () => {
      const result = await sha256('whereforeartthouromeo');
      expect(result).toEqual('+Uj/2aQXknYiltbtLyMWolccIUlotyzMYv1HG7lNsTg=');
    });
  });

  describe('generateOAuthCodeChallenge', () => {
    it('generates some random text between 43 and 128 characters long', () => {
      for (let i = 0; i < 100; i += 1) {
        const result = generateOAuthCodeChallenge();
        expect(result.length).toBeGreaterThanOrEqual(43);
        expect(result.length).toBeLessThanOrEqual(128);
      }
    });
  });

  describe('custom CryptoAdapter', () => {
    const mockAdapter = {
      digest: vi.fn(),
      getRandomValues: vi.fn(),
    };

    beforeAll(() => {
      setCryptoAdapter(mockAdapter);
    });

    it('sha256 delegates to the adapter digest', async () => {
      const hashBuffer = new TextEncoder().encode('mock-hash').buffer;
      mockAdapter.digest.mockResolvedValue(hashBuffer);

      const result = await sha256('hello');

      expect(mockAdapter.digest).toHaveBeenCalledWith(
        'SHA-256',
        new TextEncoder().encode('hello'),
      );
      expect(result).toBeTypeOf('string');
    });

    it('generateOAuthCodeChallenge delegates to the adapter getRandomValues', () => {
      const filled = new Uint8Array(100).fill(42);
      mockAdapter.getRandomValues.mockReturnValue(filled);

      const result = generateOAuthCodeChallenge();

      expect(mockAdapter.getRandomValues).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(43);
      expect(result.length).toBeLessThanOrEqual(128);
    });
  });
});
