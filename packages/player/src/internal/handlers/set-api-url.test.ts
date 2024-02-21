// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { setApiUrl } from './set-api-url';

describe('setEventUrl', () => {
  it('sets the url in config', () => {
    setApiUrl('https://cool-api-service.com');

    expect(Config.get('apiUrl')).toEqual('https://cool-api-service.com');
  });

  it('fails if not a url', () => {
    expect(() => setApiUrl('derp')).toThrow(
      "Failed to construct 'URL': Invalid URL",
    );
  });
});
