import { webcrypto } from 'node:crypto';

import { base64URLEncode, generateOAuthCodeChallenge, sha256 } from './utils';

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
});
