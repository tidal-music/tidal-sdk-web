// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { setClientPlatform } from './set-client-platform';

describe('setClientPlatform handler', () => {
  it('sets the client token in config', () => {
    setClientPlatform('tomte');

    expect(Config.get('clientPlatform')).toEqual('tomte');
  });
});
