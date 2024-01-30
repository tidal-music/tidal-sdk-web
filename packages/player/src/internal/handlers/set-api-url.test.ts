import { expect } from 'chai';

import * as Config from '../../config';

import { setApiUrl } from './set-api-url';

describe('setEventUrl', () => {
  it('sets the url in config', () => {
    setApiUrl('https://cool-api-service.com');

    expect(Config.get('apiUrl')).to.equal('https://cool-api-service.com');
  });

  it('fails if not a url', () => {
    expect(() => setApiUrl('derp')).to.throw(
      "Failed to construct 'URL': Invalid URL",
    );
  });
});
