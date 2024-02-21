// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { setEventUrl } from './set-event-url';

describe('setEventUrl', () => {
  it('sets the url in config', () => {
    setEventUrl('https://cool-event-service.com');

    expect(Config.get('eventUrl')).toEqual('https://cool-event-service.com');
  });

  it('fails if not a url', () => {
    expect(() => setEventUrl('herp')).toThrow(
      "Failed to construct 'URL': Invalid URL",
    );
  });
});
