import { expect } from 'chai';

import * as Config from '../../config';

import { setEventUrl } from './set-event-url';

describe('setEventUrl', () => {
  it('sets the url in config', () => {
    setEventUrl('https://cool-event-service.com');

    expect(Config.get('eventUrl')).to.equal('https://cool-event-service.com');
  });

  it('fails if not a url', () => {
    expect(() => setEventUrl('herp')).to.throw(
      "Failed to construct 'URL': Invalid URL",
    );
  });
});
