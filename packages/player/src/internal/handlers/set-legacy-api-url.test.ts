import { expect } from 'chai';

import * as Config from '../../config';

import { setLegacyApiUrl } from './set-legacy-api-url';

describe('setLegacyApiUrl', () => {
  it('sets the legacy url in config', () => {
    setLegacyApiUrl('https://legacy-api.example.com/v1');

    expect(Config.get('legacyApiUrl')).to.equal(
      'https://legacy-api.example.com/v1',
    );
  });

  it('fails if not a url', () => {
    expect(() => setLegacyApiUrl('not-a-url')).to.throw(
      "Failed to construct 'URL': Invalid URL",
    );
  });
});
